import { z } from 'zod';

export const profileSchema = z.object({
  fullName: z.string().min(1),
  professionalTitle: z.string().min(1),
  about: z.string(),
  skills: z.array(z.string().min(1)),
  targetRoles: z.array(z.string().min(1)),
  links: z.object({
    github: z.string().url(),
    portfolio: z.string().url(),
    linkedin: z.string().url(),
  }),
});

export const profileUpdateSchema = profileSchema
  .partial()
  .extend({
    links: profileSchema.shape.links.partial().optional(),
  });

export type Profile = z.infer<typeof profileSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
