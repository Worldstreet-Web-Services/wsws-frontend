import { zodResolver as baseZodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import type { z } from 'zod';

type BaseZodResolverSchema = Parameters<typeof baseZodResolver>[0];
type BaseZodResolverSchemaOptions = Parameters<typeof baseZodResolver>[1];
type BaseZodResolverOptions = Parameters<typeof baseZodResolver>[2];

// The merged workspace currently resolves incompatible Zod type identities at
// the resolver boundary. Cast once here and keep form call sites typed.
export function zodResolver<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  schemaOptions?: BaseZodResolverSchemaOptions,
  resolverOptions?: BaseZodResolverOptions,
): Resolver<z.infer<TSchema>> {
  return baseZodResolver(
    schema as unknown as BaseZodResolverSchema,
    schemaOptions,
    resolverOptions,
  ) as Resolver<z.infer<TSchema>>;
}
