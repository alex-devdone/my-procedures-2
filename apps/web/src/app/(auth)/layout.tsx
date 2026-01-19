import { auth } from "@my-procedures-2/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (session?.user) {
		redirect("/");
	}

	return <>{children}</>;
}
