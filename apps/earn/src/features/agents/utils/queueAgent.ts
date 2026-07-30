import { Queue } from 'bullmq';
import Redis from 'ioredis';

import logger from '@earn/lib/logger';

type AgentActionType =
  | 'autoReviewGrantApplication'
  | 'generateContextProject'
  | 'autoReviewProjectApplication'
  | 'generateContextBounty';

interface AgentNotificationParams {
  type: AgentActionType;
  id: string;
  userId?: string;
  otherInfo?: any;
}

const MISSING_AGENT_REDIS_URL_MESSAGE =
  'Missing AGENT_REDIS_URL environment variable for agent queue';

let logicQueue: Queue | null = null;

function getLogicQueue(): Queue {
  if (logicQueue) {
    return logicQueue;
  }

  const redisUrl = process.env.AGENT_REDIS_URL;

  if (!redisUrl) {
    throw new Error(MISSING_AGENT_REDIS_URL_MESSAGE);
  }

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
  logicQueue = new Queue('agentLogicQueue', { connection: redis });

  return logicQueue;
}

export async function queueAgent({
  type,
  id,
  userId,
  otherInfo,
}: AgentNotificationParams): Promise<void> {
  try {
    const job = await getLogicQueue().add(
      'processLogic',
      {
        type,
        id,
        userId,
        otherInfo,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        priority: 1,
        removeOnComplete: true,
        removeOnFail: 500,
      },
    );

    console.log(
      `Agent notification queued successfully: jobId=${job.id}, type=${type}, id=${id}`,
    );
    logger.info(
      `Agent notification queued successfully: jobId=${job.id}, type=${type}, id=${id}`,
    );

    return;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error({
      message: `Failed to queue agent job : type=${type}, id=${id}`,
      error: errorMessage,
      stack: errorStack,
      metadata: { type, id },
    });

    throw new Error(`Failed to queue agent job: ${errorMessage}`);
  }
}
