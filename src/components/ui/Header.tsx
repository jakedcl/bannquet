'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed w-full bg-brand-green text-white h-header z-50"
    >
      <div className="max-w-container mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="BNQT Logo"
            width={160}
            height={40}
            priority
            className="object-contain w-auto h-[40px] hover:opacity-90 transition-opacity"
          />
        </Link>

        <nav className="flex gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative px-2 py-1 text-sm font-medium tracking-wide uppercase transition-colors
                ${pathname === item.href ? 'text-white' : 'text-white/80 hover:text-white'}
              `}
            >
              {pathname === item.href && (
                <motion.span
                  layoutId="underline"
                  className="absolute left-0 top-full h-[2px] w-full bg-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30
                  }}
                />
              )}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </motion.header>
  );
} 