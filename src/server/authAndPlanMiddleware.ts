import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import type { UserPlan } from '../shared/types.ts';

if (!getApps().length) {
  initializeApp({ projectId: firebaseConfig.projectId });
}

export const adminAuth = getAuth();

const ENTITLEMENT_SECRET =
  process.env.ENTITLEMENT_SECRET ||
  crypto
    .createHash('sha256')
    .update(`${firebaseConfig.projectId}:${firebaseConfig.appId}:radar-pro`)
    .digest('hex');

const PLAN_RANK: Record<UserPlan, number> = {
  FREE: 0,
  PRO: 1,
  PREMIUM: 2,
};

export interface VerifiedSession {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  plan: UserPlan;
  idToken: string;
}

export interface AuthenticatedRequest extends Request {
  authSession?: VerifiedSession;
}

export function signEntitlementToken(uid: string, plan: UserPlan): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `${uid}:${plan}:${exp}`;
  const sig = crypto
    .createHmac('sha256', ENTITLEMENT_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyEntitlementToken(
  token: string,
  expectedUid: string
): UserPlan | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [uid, plan, expStr, sig] = raw.split(':');
    if (!uid || !plan || !expStr || !sig) return null;
    if (uid !== expectedUid) return null;
    if (Date.now() > Number(expStr)) return null;
    if (plan !== 'FREE' && plan !== 'PRO' && plan !== 'PREMIUM') return null;
    const expectedSig = crypto
      .createHmac('sha256', ENTITLEMENT_SECRET)
      .update(`${uid}:${plan}:${expStr}`)
      .digest('hex');
    if (sig !== expectedSig) return null;
    return plan;
  } catch {
    return null;
  }
}

async function fetchFirestoreUserPlan(
  uid: string,
  idToken: string
): Promise<UserPlan> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(firebaseConfig.firestoreDatabaseId)}/documents/users/${encodeURIComponent(uid)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return 'FREE';
    const doc = (await res.json()) as {
      fields?: { plan?: { stringValue?: string } };
    };
    const p = doc.fields?.plan?.stringValue;
    if (p === 'PRO' || p === 'PREMIUM' || p === 'FREE') return p;
    return 'FREE';
  } catch {
    return 'FREE';
  }
}

export async function attachOptionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded: DecodedIdToken = await adminAuth.verifyIdToken(idToken);
    const email = decoded.email || '';
    const emailVerified = Boolean(decoded.email_verified);
    const adminEmail = (process.env.ADMIN_EMAIL || 'cesarluzz76@gmail.com').toLowerCase();
    const isAdmin = emailVerified && email.toLowerCase() === adminEmail;

    let plan: UserPlan = await fetchFirestoreUserPlan(decoded.uid, idToken);
    const entHeader = req.headers['x-entitlement-token'];
    if (typeof entHeader === 'string') {
      const signedPlan = verifyEntitlementToken(entHeader, decoded.uid);
      if (signedPlan && PLAN_RANK[signedPlan] > PLAN_RANK[plan]) {
        plan = signedPlan;
      }
    }
    if (isAdmin) {
      plan = 'PREMIUM';
    }

    req.authSession = {
      uid: decoded.uid,
      email,
      emailVerified,
      isAdmin,
      plan,
      idToken,
    };
  } catch {
    // invalid token treated as anonymous
  }
  next();
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await attachOptionalAuth(req, res, () => {
    if (!req.authSession) {
      res.status(401).json({
        error: 'Autenticação necessária para acessar este recurso.',
      });
      return;
    }
    next();
  });
}

export function requirePlan(minPlan: UserPlan) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await attachOptionalAuth(req, res, () => {
      if (!req.authSession) {
        res.status(401).json({
          error: 'Faça login para utilizar recursos avançados.',
          requiredPlan: minPlan,
        });
        return;
      }
      if (PLAN_RANK[req.authSession.plan] < PLAN_RANK[minPlan]) {
        res.status(403).json({
          error: `Recurso exclusivo do plano ${minPlan} ou superior.`,
          requiredPlan: minPlan,
          currentPlan: req.authSession.plan,
        });
        return;
      }
      next();
    });
  };
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await attachOptionalAuth(req, res, () => {
    if (!req.authSession || !req.authSession.isAdmin) {
      res.status(403).json({
        error: 'Acesso restrito a administradores autenticados.',
      });
      return;
    }
    next();
  });
}

export interface CheckoutSessionResult {
  configured: boolean;
  provider: 'STRIPE' | 'MERCADO_PAGO';
  checkoutUrl?: string;
  sessionId?: string;
  message: string;
}

export async function createPaymentCheckoutSession(params: {
  provider: 'STRIPE' | 'MERCADO_PAGO';
  plan: 'PRO' | 'PREMIUM';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  amountBRL: number;
  userEmail: string;
  uid: string;
  appUrl: string;
}): Promise<CheckoutSessionResult> {
  if (params.provider === 'STRIPE') {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return {
        configured: false,
        provider: 'STRIPE',
        message:
          'STRIPE_SECRET_KEY não configurada no servidor. Configure a variável de ambiente para habilitar checkout Stripe em produção.',
      };
    }

    const body = new URLSearchParams();
    body.set('mode', 'subscription');
    body.set('success_url', `${params.appUrl}/?checkout=success&provider=stripe&session_id={CHECKOUT_SESSION_ID}&plan=${params.plan}`);
    body.set('cancel_url', `${params.appUrl}/?checkout=cancelled`);
    body.set('customer_email', params.userEmail);
    body.set('line_items[0][quantity]', '1');
    body.set('line_items[0][price_data][currency]', 'brl');
    body.set('line_items[0][price_data][unit_amount]', String(Math.round(params.amountBRL * 100)));
    body.set('line_items[0][price_data][recurring][interval]', params.billingCycle === 'ANNUAL' ? 'year' : 'month');
    body.set('line_items[0][price_data][product_data][name]', `RADAR VALUATION PRO — Plano ${params.plan}`);
    body.set('metadata[uid]', params.uid);
    body.set('metadata[plan]', params.plan);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) {
      return {
        configured: true,
        provider: 'STRIPE',
        message: json.error?.message || 'Erro ao criar sessão Stripe.',
      };
    }
    return {
      configured: true,
      provider: 'STRIPE',
      checkoutUrl: json.url,
      sessionId: json.id,
      message: 'Sessão Stripe criada com sucesso.',
    };
  }

  // Mercado Pago Preference API
  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!mpToken) {
    return {
      configured: false,
      provider: 'MERCADO_PAGO',
      message:
        'MERCADOPAGO_ACCESS_TOKEN não configurado no servidor. Configure a variável de ambiente para habilitar checkout Mercado Pago.',
    };
  }

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mpToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          title: `RADAR VALUATION PRO — Plano ${params.plan} (${params.billingCycle})`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(params.amountBRL.toFixed(2)),
        },
      ],
      payer: { email: params.userEmail },
      external_reference: `${params.uid}:${params.plan}`,
      back_urls: {
        success: `${params.appUrl}/?checkout=success&provider=mercadopago&plan=${params.plan}`,
        failure: `${params.appUrl}/?checkout=failed`,
        pending: `${params.appUrl}/?checkout=pending`,
      },
      auto_return: 'approved',
    }),
  });
  const mpJson = (await mpRes.json()) as {
    id?: string;
    init_point?: string;
    message?: string;
  };
  if (!mpRes.ok || !mpJson.init_point) {
    return {
      configured: true,
      provider: 'MERCADO_PAGO',
      message: mpJson.message || 'Erro ao criar preferência no Mercado Pago.',
    };
  }
  return {
    configured: true,
    provider: 'MERCADO_PAGO',
    checkoutUrl: mpJson.init_point,
    sessionId: mpJson.id,
    message: 'Preferência Mercado Pago criada com sucesso.',
  };
}
