"use client";

import useMediaQuery from '@mui/material/useMediaQuery';
import { useParams } from 'next/navigation';
import ChoosePackageDesktop from './Choose_package_desktop';
import ChoosePackageMobile from './Choose_package_mobile';
import { useAnyPoojaDetailQuery } from '@/hooks/useAllPoojas';
import { extractIdFromSlug } from '@/lib/slug';

/**
 * Picks the detail layout for a pooja.
 *
 * Legacy (`poojas`) documents keep the existing viewport split. Poojas from the
 * new `newpoojas` collection always use the mobile layout: the desktop one is
 * built around four per-mandir packages and puja dates, and the new schema has
 * neither — it carries a single price pair and an embedded temple.
 *
 * The detail query is shared (same react-query key as the child), so resolving
 * the source here costs no extra request.
 */
const Choose_package = () => {
  const isDesktop = useMediaQuery('(min-width:768px)');
  const { id } = useParams<{ id: string }>();
  // `id` is really a "name-id" slug (see lib/slug.ts) — recover the real
  // Mongo id for the lookup. A bare legacy id still works unchanged.
  const { data: detail, isLoading } = useAnyPoojaDetailQuery(extractIdFromSlug(id));

  // wait for the source before choosing, otherwise a new pooja would briefly
  // mount the desktop page and fire its legacy-only request
  if (isLoading) return null;

  if (detail?.source === 'new') return <ChoosePackageMobile />;

  return isDesktop ? <ChoosePackageDesktop /> : <ChoosePackageMobile />;
};

export default Choose_package;
