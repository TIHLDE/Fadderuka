-- Lets a user pin the programme they are starting when TIHLDE's profile still
-- shows the one they came from (Digital transformasjon: a 2-year continuation
-- whose new students keep their bachelor STUDY group and cohort on tihlde.org).
ALTER TABLE "User" ADD COLUMN "studieretningOverride" TEXT;
