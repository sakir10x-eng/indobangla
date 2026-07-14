import { icons, type LucideProps } from "lucide-react";
import { type FC } from "react";

interface IconProps extends LucideProps {
  name: keyof typeof icons;
}

const Icon: FC<IconProps> = ({ name, color, size, strokeWidth, ...rest }) => {
  const LucideIcon = icons[name];

  if (!LucideIcon) return null;

  return (
    <LucideIcon
      color={color}
      size={size}
      height="1em"
      width="1em"
      strokeWidth={strokeWidth}
      {...rest}
    />
  );
};

export default Icon;
