/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Employer } from "@/db/schema";
import { Download, Eye, File, FileText } from "lucide-react";
import { useState } from "react";

interface ViewEmployerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employer: Employer;
  onEmployerUpdated?: () => void;
}

export function ViewEmployerModal({
  open,
  onOpenChange,
  employer,
}: ViewEmployerModalProps) {
  const [previewFile, setPreviewFile] = useState<{ name: string; type: string; url: string } | null>(null);

  if (!employer) return null;

  const getAccountStatusBadge = () => {
    switch (employer.accountStatus) {
      case "approved":
        return <Badge className="bg-green-500">Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending Approval</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "suspended":
        return <Badge variant="secondary">Suspended</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="truncate">{employer.establishmentName}</DialogTitle>
                <p className="text-sm text-slate-600 truncate">
                  {[employer.houseStreetVillage, employer.barangay, employer.municipality, employer.province]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {getAccountStatusBadge()}
                <Badge variant={employer.createdBy === "admin" ? "default" : "secondary"}>
                  {employer.createdBy === "admin" ? "Admin Registered" : "Self-Registered"}
                </Badge>
                {employer.srsSubscriber && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">SRS Subscriber</Badge>
                )}
                {employer.archived && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700">Archived</Badge>
                )}
              </div>
            </div>
          </div>
          {employer.accountStatus === "rejected" && employer.rejectionReason && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <span className="font-semibold">Rejection Reason:</span> {employer.rejectionReason}
              </p>
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1">
          <TabsList className="grid w-full grid-cols-6 sticky top-0">
            <TabsTrigger value="info">Basic Info</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="industry">Industry</TabsTrigger>
            <TabsTrigger value="geo">Geographic</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="docs">Documents</TabsTrigger>
          </TabsList>

          <div className="p-4 overflow-y-auto">
            {/* Basic Info Tab */}
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">ID</p>
                  <p className="text-sm font-mono text-slate-900">{employer.id}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Created By</p>
                  <Badge variant={employer.createdBy === "admin" ? "default" : "secondary"}>
                    {employer.createdBy === "admin" ? "Admin Registered" : "Self-Registered"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Contact Number</p>
                  <p className="text-sm text-slate-900">{employer.contactNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Email</p>
                  <p className="text-sm text-slate-900">{employer.email || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Manpower Agency</p>
                  <Badge variant={employer.isManpowerAgency ? "default" : "secondary"}>
                    {employer.isManpowerAgency ? "Yes" : "No"}
                  </Badge>
                </div>
                {employer.isManpowerAgency && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">DOLE Certification No.</p>
                    <p className="text-sm text-slate-900">{employer.doleCertificationNumber || "N/A"}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Contact Person</h4>
                {employer.contactPerson && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Name</p>
                      <p className="text-sm text-slate-900">{employer.contactPerson.personName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Designation</p>
                      <p className="text-sm text-slate-900">{employer.contactPerson.designation || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Email</p>
                      <p className="text-sm text-slate-900">{employer.contactPerson.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Contact Number</p>
                      <p className="text-sm text-slate-900">{employer.contactPerson.contactNumber || "N/A"}</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address" className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Street Address</p>
                <p className="text-sm text-slate-900">{employer.houseStreetVillage || "N/A"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Barangay</p>
                  <p className="text-sm text-slate-900">{employer.barangay || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Municipality</p>
                  <p className="text-sm text-slate-900">{employer.municipality || "N/A"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Province</p>
                <p className="text-sm text-slate-900">{employer.province || "N/A"}</p>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Company Information</p>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-slate-600">Company TIN</p>
                    <p className="text-sm font-mono text-slate-900">{employer.companyTIN || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Business Permit Number</p>
                    <p className="text-sm text-slate-900">{employer.businessPermitNumber || "N/A"}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-slate-600">BIR Form 2303 Number</p>
                  <p className="text-sm text-slate-900">{employer.bir2303Number || "N/A"}</p>
                </div>
              </div>
            </TabsContent>

            {/* Industry Tab */}
            <TabsContent value="industry" className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Selected Industries</p>
                <div className="flex flex-wrap gap-2">
                  {employer.industryType && employer.industryType.length > 0 ? (
                    [...employer.industryType]
                      .sort((a: string, b: string) => parseInt(a) - parseInt(b))
                      .map((code: string) => (
                      <Badge key={code} variant="outline" className="bg-blue-50">
                        {code} - {code}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600">No industries selected</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Employment Data Tab */}
            <TabsContent value="employment" className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Employment Statistics (SRS Form 2)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">No. of Paid Employees</p>
                    <p className="text-2xl font-bold text-blue-600">{employer.numberOfPaidEmployees || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">No. of Vacant Positions</p>
                    <p className="text-2xl font-bold text-green-600">{employer.numberOfVacantPositions || 0}</p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">SRS Subscription</h4>
                <div className="flex items-center gap-3">
                  <Badge variant={employer.srsSubscriber ? "default" : "secondary"}>
                    {employer.srsSubscriber ? "SRS Subscriber" : "Not Subscribed"}
                  </Badge>
                  {employer.subscriptionStatus && (
                    <span className="text-sm text-slate-600">Status: {employer.subscriptionStatus}</span>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Geographic Identification Tab */}
            <TabsContent value="geo" className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Geographic Identification (SRS Form 2)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Province</p>
                    <p className="text-sm text-slate-900">{employer.province || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Municipality/City</p>
                    <p className="text-sm text-slate-900">{employer.municipality || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Barangay</p>
                    <p className="text-sm text-slate-900">{employer.barangay || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Geographic Code</p>
                    <p className="text-sm font-mono text-slate-900">{employer.geographicCode || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Tel. No.</p>
                    <p className="text-sm text-slate-900">{employer.telNumber || "N/A"}</p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Barangay Officials</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Bgy Chairperson</p>
                      <p className="text-sm text-slate-900">{employer.barangayChairperson || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Chairperson Tel. No.</p>
                      <p className="text-sm text-slate-900">{employer.chairpersonTelNumber || "N/A"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Bgy Secretary</p>
                      <p className="text-sm text-slate-900">{employer.barangaySecretary || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Secretary Tel. No.</p>
                      <p className="text-sm text-slate-900">{employer.secretaryTelNumber || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Prepared By Information</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Name</p>
                      <p className="text-sm text-slate-900">{employer.preparedByName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Designation</p>
                      <p className="text-sm text-slate-900">{employer.preparedByDesignation || "N/A"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Contact Number</p>
                      <p className="text-sm text-slate-900">{employer.preparedByContact || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Date Accomplished</p>
                      <p className="text-sm text-slate-900">
                        {employer.dateAccomplished ? new Date(employer.dateAccomplished).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {employer.remarks && (
                <div className="border-t pt-4 mt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Remarks</p>
                  <p className="text-sm text-slate-900 mt-2 whitespace-pre-wrap">{employer.remarks}</p>
                </div>
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="docs" className="space-y-4">
              <div className="space-y-3">
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <File className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Business Permit</p>
                        <p className="text-xs text-slate-600">Photocopy of business permit</p>
                      </div>
                    </div>
                    {employer.businessPermitFile ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(employer.businessPermitFile?.path || employer.businessPermitFile?.url, "_blank")}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={employer.businessPermitFile?.path || employer.businessPermitFile?.url} download={employer.businessPermitFile?.name}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary">Not uploaded</Badge>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <File className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">BIR Form 2303</p>
                        <p className="text-xs text-slate-600">Photocopy of BIR form</p>
                      </div>
                    </div>
                    {employer.bir2303File ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(employer.bir2303File?.path || employer.bir2303File?.url, "_blank")}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={employer.bir2303File?.path || employer.bir2303File?.url} download={employer.bir2303File?.name}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary">Not uploaded</Badge>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <File className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Company Profile</p>
                        <p className="text-xs text-slate-600">Company background and information</p>
                      </div>
                    </div>
                    {employer.companyProfileFile ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(employer.companyProfileFile?.path || employer.companyProfileFile?.url, "_blank")}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={employer.companyProfileFile?.path || employer.companyProfileFile?.url} download={employer.companyProfileFile?.name}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary">Not uploaded</Badge>
                    )}
                  </div>
                </div>

                {employer.isManpowerAgency && (
                  <div className="border rounded-lg p-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <File className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">DOLE Certification</p>
                          <p className="text-xs text-slate-600">D.O. 174 Certification</p>
                        </div>
                      </div>
                      {employer.doleCertificationFile ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(employer.doleCertificationFile?.path || employer.doleCertificationFile?.url, "_blank")}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={employer.doleCertificationFile?.path || employer.doleCertificationFile?.url} download={employer.doleCertificationFile?.name}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary">Not uploaded</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>


          </div>
        </Tabs>

        {/* File Preview Dialog */}
        {previewFile && (
          <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Preview: {previewFile.name}</DialogTitle>
              </DialogHeader>
              <div className="w-full h-[600px] bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                {previewFile.type.startsWith('image/') ? (
                  <img 
                    src={previewFile.url} 
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">{previewFile.name}</p>
                    <p className="text-xs text-slate-500 mt-2">File cannot be previewed in browser</p>
                    <Button 
                      size="sm"
                      className="mt-4"
                      onClick={() => window.open(previewFile.url, '_blank')}
                    >
                      Download File
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
