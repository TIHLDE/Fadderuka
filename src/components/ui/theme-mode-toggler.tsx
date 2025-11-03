'use client';

import { Button, type ButtonProps } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer';
import { cn } from '~/lib/utils';
import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import React from 'react';

export function MobileModeToggle({ ...props }: ButtonProps) {
  const { setTheme } = useTheme();

  return (
    <>
      <Drawer>
        <DrawerTrigger asChild>
          <ThemeToggleButton {...props} mobile={true} />
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Velg fargetema</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col gap-3 px-4">
            <Button
              variant="outline"
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button
              variant="outline"
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
            <Button
              variant="outline"
              onClick={() => setTheme('system')}
            >
              System
            </Button>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button className="w-full">Lukk</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export function ModeToggle({ ...props }: ButtonProps) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ThemeToggleButton {...props} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ThemeToggleButtonProps extends ButtonProps {
  mobile?: boolean;
}

const ThemeToggleButton = React.forwardRef<
  HTMLButtonElement,
  ThemeToggleButtonProps
>(({ className, mobile, ...props }, ref) => {
  return (
    <Button
      variant="outline"
      size={mobile ? 'lg' : 'icon'}
      {...props}
      className={cn(
        className,
        `${mobile ? '[&>*]:h-9 [&>*]:w-9' : '[&>*]:h-5 [&>*]:w-5'}`,
        'flex place-content-center px-0',
      )}
      ref={ref}
    >
      <SunIcon className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
});

ThemeToggleButton.displayName = 'ThemeToggleButton';