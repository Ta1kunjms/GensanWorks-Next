"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  children: React.ReactNode;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within <Select />");
  }
  return context;
}

type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

type SelectItemProps = {
  value: string | null;
  children: React.ReactNode;
};

type SelectTriggerProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
};

type SelectElementProps = {
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
  value?: string | null;
};

function extractSelectMetadata(children: React.ReactNode) {
  let placeholder = "Select an option";
  let triggerClassName = "";
  const items: Array<{ value: string; label: string }> = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const element = child as React.ReactElement<SelectElementProps>;

    if ((element.type as { displayName?: string }).displayName === SelectValue.displayName) {
      placeholder = typeof element.props.placeholder === "string" ? element.props.placeholder : placeholder;
      return;
    }

    if ((element.type as { displayName?: string }).displayName === SelectTrigger.displayName) {
      triggerClassName = typeof element.props.className === "string" ? element.props.className : triggerClassName;
      return;
    }

    if ((element.type as { displayName?: string }).displayName === SelectContent.displayName) {
      React.Children.forEach(element.props.children, (nested) => {
        if (!React.isValidElement(nested)) return;
        const nestedElement = nested as React.ReactElement<SelectElementProps>;
        if ((nestedElement.type as { displayName?: string }).displayName !== SelectItem.displayName) return;
        items.push({
          value: String(nestedElement.props.value ?? ""),
          label: React.Children.toArray(nestedElement.props.children).map(String).join(""),
        });
      });
    }
  });

  return { items, placeholder, triggerClassName };
}

function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const { placeholder, triggerClassName } = extractSelectMetadata(children);
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? value ?? "");
  const currentValue = value ?? internalValue;

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleChange, placeholder, triggerClassName, children }}>
      {children}
    </SelectContext.Provider>
  );
}

function SelectTrigger({ className, children }: SelectTriggerProps) {
  const { placeholder, triggerClassName, value, onValueChange, children: selectChildren } = useSelectContext();
  const metadata = extractSelectMetadata(selectChildren);
  const items = metadata.items;

  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-offset-white focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName
        )}
        value={value ?? ""}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        <option value="" disabled={!items.some((item) => item.value === "")}>{placeholder}</option>
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      {children}
    </div>
  );
}
SelectTrigger.displayName = "SelectTrigger";

function SelectValue({ placeholder }: { placeholder?: string }) {
  void placeholder;
  return null;
}
SelectValue.displayName = "SelectValue";

function SelectContent({ children }: { children?: React.ReactNode }) {
  void children;
  return null;
}
SelectContent.displayName = "SelectContent";

function SelectItem({ value, children }: SelectItemProps) {
  void value;
  void children;
  return null;
}
SelectItem.displayName = "SelectItem";

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };