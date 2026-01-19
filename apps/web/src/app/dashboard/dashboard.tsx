"use client";
import { useQuery } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export default function Dashboard() {
	const privateData = useQuery(trpc.privateData.queryOptions());

	return <p>API: {privateData.data?.message}</p>;
}
