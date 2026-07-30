import { Ratelimit } from '@upstash/ratelimit';

import { getRedis } from './redis';

type LazyRatelimitConfig = {
  readonly limiter: ReturnType<typeof Ratelimit.fixedWindow>;
  readonly analytics: boolean;
  readonly prefix: string;
};

function createLazyRateLimiter(config: LazyRatelimitConfig): Ratelimit {
  let instance: Ratelimit | null = null;

  const getInstance = (): Ratelimit => {
    if (!instance) {
      instance = new Ratelimit({
        redis: getRedis(),
        limiter: config.limiter,
        analytics: config.analytics,
        prefix: config.prefix,
      });
    }

    return instance;
  };

  return new Proxy({} as Ratelimit, {
    get(_target, prop, receiver) {
      const value = Reflect.get(getInstance(), prop, receiver);
      return typeof value === 'function' ? value.bind(getInstance()) : value;
    },
  });
}

export const aiGenerateRateLimiter = createLazyRateLimiter({
  limiter: Ratelimit.fixedWindow(20, '1 m'),
  analytics: true,
  prefix: 'ratelimit:ai_generate',
});

export const agentRegisterRateLimiter = createLazyRateLimiter({
  limiter: Ratelimit.fixedWindow(60, '1 h'),
  analytics: true,
  prefix: 'ratelimit:agent_register',
});

export const userCreateRateLimiter = createLazyRateLimiter({
  limiter: Ratelimit.fixedWindow(60, '1 h'),
  analytics: true,
  prefix: 'ratelimit:user_create',
});

export const agentSubmitRateLimiter = createLazyRateLimiter({
  limiter: Ratelimit.fixedWindow(60, '1 h'),
  analytics: true,
  prefix: 'ratelimit:agent_submit',
});

export const agentCommentRateLimiter = createLazyRateLimiter({
  limiter: Ratelimit.fixedWindow(120, '1 h'),
  analytics: true,
  prefix: 'ratelimit:agent_comment',
});

export const agentClaimRateLimiter = createLazyRateLimiter({
  limiter: Ratelimit.fixedWindow(20, '10 m'),
  analytics: true,
  prefix: 'ratelimit:agent_claim',
});

export const ogMetadataRateLimiter = createLazyRateLimiter({
  limiter: Ratelimit.fixedWindow(60, '1 m'),
  analytics: true,
  prefix: 'ratelimit:og_metadata',
});

export const supportEmailRateLimiter = createLazyRateLimiter({
  limiter: Ratelimit.fixedWindow(5, '1 h'),
  analytics: true,
  prefix: 'ratelimit:support_email',
});

export const reportListingRateLimiter = createLazyRateLimiter({
  limiter: Ratelimit.fixedWindow(5, '1 h'),
  analytics: true,
  prefix: 'ratelimit:report_listing',
});
