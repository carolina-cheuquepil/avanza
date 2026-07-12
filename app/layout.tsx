import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") || incoming.get("host") || "localhost";
  const protocol = incoming.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/avanza-violet.png`;
  return {
    title: "Avanza — pendientes sin culpa",
    description: "Convierte pendientes abrumadores en pequeños pasos que sí puedes empezar.",
    openGraph: { title: "Avanza", description: "Pendientes sin culpa. Pasos que sí empiezas.", images: [image] },
    twitter: { card: "summary_large_image", title: "Avanza", description: "Pendientes sin culpa. Pasos que sí empiezas.", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
