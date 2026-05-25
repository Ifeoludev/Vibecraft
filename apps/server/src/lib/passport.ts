import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { Request } from 'express';
import { userRepository } from '../repositories/user.repository';

// Sessions don't reliably persist across Render's proxy boundary, so the
// session-based state store drops the CSRF state. We disable it here and
// rely on JWT cookies for post-auth security instead.
const noopStateStore = {
  store(_req: Request, cb: (err: Error | null, state: string) => void) {
    cb(null, '');
  },
  verify(_req: Request, _state: string, cb: (err: Error | null, valid: boolean) => void) {
    cb(null, true);
  },
};

// serialize/deserialize are required by Passport whenever passport.session() is active.
// They only run during the brief Google OAuth redirect window — not on every request.
passport.serializeUser((user, done) => {
  done(null, (user as Express.User).id);
});

passport.deserializeUser((id: string, done) => {
  userRepository.findById(id).then(
    (user) => done(null, user ?? false), // false (not null) signals auth failure to Passport
    (err: unknown) => done(err)
  );
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      store: noopStateStore as any,
    },
    // Google's login-scope tokens are ignored; we only need the profile to identify the user
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('Google profile missing email'));

        const user = await userRepository.upsert({
          email,
          displayName: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
        });

        done(null, user);
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

console.log('[passport] callbackURL:', `${process.env.SERVER_URL}/api/auth/google/callback`);

export default passport;
