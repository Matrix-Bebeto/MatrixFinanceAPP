type BrandLogoProps = {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}matrix-logo.png`}
      className={className}
      alt="Matrix"
    />
  )
}
