// The icons that can be put beside a line in a rate plan's "includes" list.
//
// This is a copy of the booking site's own list (app/components/planIcons.ts
// there), so the icon shown beside a line here is the icon the guest sees.
// The two have to be changed together -- a name the site does not know falls
// back to the words beside it, and then to a plain star.
import {
  Accessibility, Baby, Bath, BedDouble, Briefcase, Bus, CalendarCheck, Car,
  CigaretteOff, Clock, Coffee, CreditCard, Croissant, Dog, Droplets, Dumbbell,
  Flower2, Gift, GlassWater, Lock, Luggage, Mountain, Sparkles, Star, Tv,
  Utensils, UtensilsCrossed, Waves, Wifi, Wind, Wine,
  type LucideIcon,
} from "lucide-react";

export const PLAN_ICONS: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: "wifi", label: "WiFi", Icon: Wifi },
  { name: "breakfast", label: "Breakfast", Icon: Croissant },
  { name: "coffee", label: "Tea & coffee", Icon: Coffee },
  { name: "dinner", label: "Dinner", Icon: UtensilsCrossed },
  { name: "restaurant", label: "Restaurant", Icon: Utensils },
  { name: "drinks", label: "Drinks / bar", Icon: Wine },
  { name: "water", label: "Water / soft drinks", Icon: GlassWater },
  { name: "parking", label: "Parking", Icon: Car },
  { name: "shuttle", label: "Transfer / shuttle", Icon: Bus },
  { name: "pool", label: "Pool", Icon: Waves },
  { name: "hottub", label: "Hot tub", Icon: Droplets },
  { name: "spa", label: "Spa", Icon: Flower2 },
  { name: "gym", label: "Gym", Icon: Dumbbell },
  { name: "bed", label: "Room / bed", Icon: BedDouble },
  { name: "bath", label: "Bathroom", Icon: Bath },
  { name: "tv", label: "TV", Icon: Tv },
  { name: "aircon", label: "Air conditioning", Icon: Wind },
  { name: "safe", label: "Safe", Icon: Lock },
  { name: "kids", label: "Children / cot", Icon: Baby },
  { name: "pets", label: "Pets", Icon: Dog },
  { name: "nosmoking", label: "Non-smoking", Icon: CigaretteOff },
  { name: "view", label: "View / balcony", Icon: Mountain },
  { name: "luggage", label: "Luggage", Icon: Luggage },
  { name: "checkin", label: "Check-in / check-out", Icon: Clock },
  { name: "cancellation", label: "Free cancellation", Icon: CalendarCheck },
  { name: "payment", label: "Payment", Icon: CreditCard },
  { name: "business", label: "Work / desk", Icon: Briefcase },
  { name: "gift", label: "Treat / gift", Icon: Gift },
  { name: "accessible", label: "Accessible", Icon: Accessibility },
  { name: "star", label: "Something else", Icon: Star },
];

const BY_NAME = new Map(PLAN_ICONS.map((row) => [row.name, row.Icon]));

// When no icon was picked, read the line's own words -- "Secure parking" gets
// the car without anyone having to say so.
const BY_WORDS: { test: RegExp; Icon: LucideIcon }[] = [
  { test: /wi-?fi|internet/i, Icon: Wifi },
  { test: /breakfast/i, Icon: Croissant },
  { test: /coffee|tea|kettle/i, Icon: Coffee },
  { test: /dinner|half.?board|evening meal/i, Icon: UtensilsCrossed },
  { test: /restaurant|lunch|buffet|meal|dining/i, Icon: Utensils },
  { test: /bar|wine|cocktail|beer|prosecco|champagne/i, Icon: Wine },
  { test: /water|soft drink|juice|minibar|fridge/i, Icon: GlassWater },
  { test: /park/i, Icon: Car },
  { test: /shuttle|transfer|airport|taxi/i, Icon: Bus },
  { test: /pool|swim/i, Icon: Waves },
  { test: /hot ?tub|jacuzzi|sauna/i, Icon: Droplets },
  { test: /spa|massage|treatment/i, Icon: Flower2 },
  { test: /gym|fitness/i, Icon: Dumbbell },
  { test: /cot|crib|child|kid|baby/i, Icon: Baby },
  { test: /pet|dog/i, Icon: Dog },
  { test: /non.?smok|smoke.?free/i, Icon: CigaretteOff },
  { test: /balcony|view|terrace/i, Icon: Mountain },
  { test: /luggage|bag storage/i, Icon: Luggage },
  { test: /check.?in|check.?out|late|early/i, Icon: Clock },
  { test: /cancel/i, Icon: CalendarCheck },
  { test: /pay|deposit|refund/i, Icon: CreditCard },
  { test: /desk|work|business|meeting/i, Icon: Briefcase },
  { test: /accessib|wheelchair/i, Icon: Accessibility },
  { test: /bath|shower|towel|robe|toiletr/i, Icon: Bath },
  { test: /tv|television|radio/i, Icon: Tv },
  { test: /safe/i, Icon: Lock },
  { test: /air.?condition|heating|fan/i, Icon: Wind },
  { test: /bed|room/i, Icon: BedDouble },
];

export type PlanLine = { icon?: string | null; text: string };

export const planLineIcon = (line: PlanLine): LucideIcon => {
  const picked = line.icon ? BY_NAME.get(String(line.icon).toLowerCase()) : null;
  if (picked) return picked;
  return BY_WORDS.find(({ test }) => test.test(line.text || ""))?.Icon || Sparkles;
};
