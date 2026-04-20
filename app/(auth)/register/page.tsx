import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Create your Sponexus account as an organizer or sponsor and start building the right partnerships.",
};

export default function RegisterPage() {
  return <RegisterClient />;
}