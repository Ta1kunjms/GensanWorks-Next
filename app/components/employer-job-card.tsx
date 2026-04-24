import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Job = {
  id: string;
  positionTitle: string;
  description: string;
  location: string;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string | null;
  status: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  vacancies: number;
};
import { MapPin, Banknote, Users, MoreVertical, Edit, Trash2, Briefcase } from "lucide-react";
import { formatRelativeTime } from "@/lib/time-utils";
import { cn } from "@/lib/utils";

interface EmployerJobCardProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
  onViewApplicants: (job: Job) => void;
}

export function EmployerJobCard({ job, onEdit, onDelete, onViewApplicants }: EmployerJobCardProps) {
  const statusColors = {
    active: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200",
    pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200",
    closed: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200",
    draft: "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200",
    rejected: "bg-red-100 text-red-800 hover:bg-red-200 border-red-200",
  };

  const status = (job.status || "pending").toLowerCase();
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const statusClass = statusColors[status as keyof typeof statusColors] || statusColors.pending;

  const employmentTypeLabel = job.employmentType || "Employment Type N/A";

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-slate-200">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg leading-tight text-slate-900 line-clamp-1" title={job.positionTitle}>
              {job.positionTitle}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("font-medium border", statusClass)}>
                {statusLabel}
              </Badge>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Posted {formatRelativeTime(job.createdAt)}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-600">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(job)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Job
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewApplicants(job)}>
                <Users className="mr-2 h-4 w-4" />
                View Applicants
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(job)} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className="space-y-2.5 text-sm text-slate-600">
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="line-clamp-1">
              {job.location || "No location specified"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Banknote className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700">
              {job.salaryMin && job.salaryMax
                ? `₱${job.salaryMin.toLocaleString()} - ₱${job.salaryMax.toLocaleString()}`
                : "Salary not specified"}
               {job.salaryPeriod ? ` / ${job.salaryPeriod}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
            <span>
              {employmentTypeLabel}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 pb-4 px-4 border-t bg-slate-50/50 flex justify-between items-center mt-auto">
        <div className="flex gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-1.5" title="Vacancies">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-900">{job.vacancies || 0}</span>
            <span className="text-slate-500 text-xs">vacancies</span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onViewApplicants(job)}>
          View Applicants
        </Button>
      </CardFooter>
    </Card>
  );
}
