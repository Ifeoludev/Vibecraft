import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { userRepository } from '../repositories/user.repository';

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

const googleCallbackURL = `${process.env.SERVER_URL?.trim()}/api/auth/google/callback`;
console.log('[passport] SERVER_URL:', JSON.stringify(process.env.SERVER_URL));
console.log('[passport] callbackURL:', JSON.stringify(googleCallbackURL));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: googleCallbackURL,
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

export default passport;
