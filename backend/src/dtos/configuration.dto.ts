import { z } from 'zod';

export const updateConfigurationSchema = z.object({
  newValue: z.string().min(1, 'New configuration value is required').max(255).trim(),
});

export type UpdateConfigurationDto = z.infer<typeof updateConfigurationSchema>;
