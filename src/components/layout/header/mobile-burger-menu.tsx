'use client';

import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const navLinks = [
  { href: '/', label: 'Generelt' },
  { href: '/aktiviteter', label: 'Arrangementer' },
  { href: '/min-side', label: 'Min profil' },
];

export default function MobileBurgerMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <DrawerTrigger asChild>
        <button
          aria-label="Meny"
          className="rounded-md p-2 transition hover:bg-accent hover:text-foreground"
          type="button"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="space-y-4 text-xl" style={{ paddingLeft: '3rem', paddingRight: '2rem', paddingTop: '3.5rem', paddingBottom: '12rem' }}>
          {navLinks.map((link) => (
            <div key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="block text-foreground/80 transition hover:text-foreground"
              >
                {link.label}
              </Link>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
