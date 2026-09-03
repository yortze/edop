import {
  Pill, Utensils, BookOpen, Shirt, Plug, Wine, Sparkles,
  Gem, Boxes, Zap, Package, Laptop, Watch, Baby
} from 'lucide-react';

// Le champ `icon` d'une catégorie est un simple nom stocké en base :
// l'admin peut le changer depuis le back-office sans toucher au code.
const ICONS = {
  pill: Pill,
  utensils: Utensils,
  book: BookOpen,
  shirt: Shirt,
  plug: Plug,
  wine: Wine,
  sparkles: Sparkles,
  gem: Gem,
  boxes: Boxes,
  zap: Zap,
  laptop: Laptop,
  watch: Watch,
  baby: Baby,
  package: Package
};

export const ICON_NAMES = Object.keys(ICONS);

export default function CategoryIcon({ name, size = 22, ...rest }) {
  const Icon = ICONS[name] || Package;
  return <Icon size={size} {...rest} />;
}
