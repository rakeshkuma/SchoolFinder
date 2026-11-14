import { HOME_IMAGES, type HomeImageId } from '../../content/homeImages';

/**
 * One of the home page's licensed photographs (content/homeImages; credited under "Photo credits"), as a responsive
 * WebP. Decorative unless `alt` is given: beside a heading that says what the card is, a description of the picture
 * would only repeat it.
 */
export function HomePhoto({ id, sizes, className = '', priority = false, eager = false, alt = '' }: {
  id: HomeImageId;
  /** the rendered width, for choosing a file (an <img sizes> value) */
  sizes: string;
  className?: string;
  /** the main picture above the fold: load at once, ahead of other images */
  priority?: boolean;
  /** above the fold, but not the main picture */
  eager?: boolean;
  alt?: string;
}) {
  const img = HOME_IMAGES[id];
  return (
    <img src={img.src} srcSet={img.srcSet} sizes={sizes} width={img.width} height={img.height} alt={alt}
      loading={priority || eager ? 'eager' : 'lazy'} decoding="async" {...(priority ? { fetchpriority: 'high' } : {})}
      className={className} />
  );
}
