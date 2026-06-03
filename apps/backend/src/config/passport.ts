import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';
import Profile from '../models/Profile';

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL!,
}, async (_at, _rt, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email from Google'));

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      const existingProfile = await Profile.findOne({ user: existingUser._id });
      if (!existingProfile) {
        await Profile.create({
          user:       existingUser._id,
          first_name: profile.name?.givenName  || '',
          last_name:  profile.name?.familyName || '',
          avatar_url: profile.photos?.[0]?.value || '',
        });
      }
      // Google already verified the email
      if (!existingUser.is_email_verified) {
        await User.findByIdAndUpdate(existingUser._id, { is_email_verified: true });
      }
      return done(null, {
        id:                  existingUser._id.toString(),
        role:                existingUser.role,
        isNew:               false,
        is_profile_complete: existingUser.is_profile_complete ?? true,
      } as Express.User);
    }

    const newUser = await User.create({
      username:            `_google_${profile.id}`,
      email,
      password:            Math.random().toString(36) + 'Aa1!',
      role:                'patient',
      is_active:           true,
      google_id:           profile.id,
      is_profile_complete: false,
      is_email_verified:   true, // Google verifies the email
    });

    return done(null, {
      id:                  newUser._id.toString(),
      role:                newUser.role,
      isNew:               true,
      is_profile_complete: false,
      google_first_name:   profile.name?.givenName  || '',
      google_last_name:    profile.name?.familyName || '',
      google_avatar:       profile.photos?.[0]?.value || '',
    } as Express.User);
  } catch (err) {
    return done(err as Error);
  }
}));

export default passport;
