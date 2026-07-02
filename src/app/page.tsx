import { StudioLanding } from "@/components/studio-landing";
import type { Work } from "@/types/work";
import worksData from "../../data/works.json";

export default function Home() {
  return <StudioLanding works={worksData as Work[]} />;
}
