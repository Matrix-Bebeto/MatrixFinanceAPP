type BrandLogoProps = {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}matrixlabs-logo-official.jpg`}
      className={className}
      alt="MatrixLabs"
      width="1024"
      height="1024"
      decoding="async"
      fetchPriority="high"
    />
  )
}
