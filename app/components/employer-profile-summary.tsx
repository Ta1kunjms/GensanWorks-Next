import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin } from "lucide-react";

interface Props {
  establishmentName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export function EmployerProfileSummary({
  establishmentName,
  contactPerson,
  email,
  phone,
  address,
}: Props) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 border border-blue-100 space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-slate-900">{establishmentName || "Your Company"}</h2>
        <p className="text-sm text-slate-500">{contactPerson || "No contact person"}</p>
        <Badge className="mt-3 bg-green-50 text-green-700 border-0">Verified Employer</Badge>
      </div>
      <div className="space-y-3 text-sm text-slate-600">
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
          <Mail className="w-4 h-4 text-blue-500" />
          <span className="break-all">{email || "Add company email"}</span>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
          <Phone className="w-4 h-4 text-blue-500" />
          <span>{phone || "Add contact number"}</span>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span>{address || "Add business address"}</span>
        </div>
      </div>
    </div>
  );
}
