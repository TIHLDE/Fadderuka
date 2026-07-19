declare module "tailwind-merge" {
  export function twMerge(...classes: (string | undefined | null | false)[]): string;
}

