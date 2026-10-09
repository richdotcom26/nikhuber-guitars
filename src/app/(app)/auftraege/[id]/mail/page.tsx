import { BelegMailSeite } from "../../../_components/beleg-mail-seite";

export default async function AuftragMailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BelegMailSeite art="auftrag" id={id} />;
}
