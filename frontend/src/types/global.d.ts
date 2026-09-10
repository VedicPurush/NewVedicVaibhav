export {};

/**
 * Next ships no ambient declaration for stylesheet imports, so a side-effect
 * `import "./Navbar.css"` has nothing to resolve to and the language server
 * reports it as an untyped module. The bundler handles these — they just need
 * to exist as far as the type system is concerned.
 */
declare module "*.css";
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}
