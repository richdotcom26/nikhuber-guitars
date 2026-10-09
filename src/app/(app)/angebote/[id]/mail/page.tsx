import { BelegMailSeite } from "../../../_components/beleg-mail-seite";

export default async function AngebotMailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BelegMailSeite art="angebot" id={id} />;
}
