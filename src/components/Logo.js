// Logo files live in /public:  /purebook-logo.svg (light bg)  /purebook-logo-white.svg (dark bg)
export default function Logo({ light = false, className = 'brand-img' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={light ? '/purebook-logo-white.svg' : '/purebook-logo.svg'}
      alt="PureBook"
      width={303}
      height={64}
      className={className}
      draggable={false}
    />
  );
}
