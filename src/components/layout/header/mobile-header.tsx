import Logo from '~/components/ui/logo';
import { ThemeToggle } from '~/components/ui/theme-mode-toggler';
import { UserArea } from '../user-area';
import { auth } from '~/server/auth';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import MobileBurgerMenu from './mobile-burger-menu';

export default async function MobileHeader() {
  const session = await auth();

  return (
    <div className="flex w-full items-center justify-between">
      <Link href="/" aria-label="TIHLDE">
        <Logo />
      </Link>

      <div className="flex items-center gap-2 text-foreground/60 dark:text-foreground/80">
        <button
          aria-label="Varsler"
          className="rounded-md p-2 transition hover:bg-accent hover:text-foreground"
          type="button"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <ThemeToggle className="rounded-md p-2 transition hover:bg-accent hover:text-foreground" />
        <UserArea
          name={session?.user?.firstName ?? 'Gjest'}
          image={session?.user?.profilePicture ?? ''}
          admin={session?.user?.role === 'ADMIN'}
          isAuthenticated={!!session?.user}
        />
        <MobileBurgerMenu />
      </div>
    </div>
  );
}
