import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReactNode } from "react";

interface TabConfig {
  value: string;
  label: string;
  content: ReactNode;
}

interface Props {
  tabs: TabConfig[];
  defaultValue: string;
  onValueChange?: (value: string) => void;
}

export function EmployerProfileTabs({ tabs, defaultValue, onValueChange }: Props) {
  return (
    <Tabs defaultValue={defaultValue} className="space-y-4" onValueChange={onValueChange}>
      <TabsList className="bg-slate-100 rounded-full p-1 w-full justify-start overflow-auto">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-4 py-2 text-sm font-medium">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="bg-slate-50 rounded-3xl border border-slate-100 p-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
