"use client";

import type { ReactElement } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Showcase of the installed shadcn/ui components: form card, dialog, dropdown menu and toast. */
export const ComponentDemo = (): ReactElement => (
  <Card className="w-full max-w-sm">
    <CardHeader>
      <CardTitle>shadcn/ui demo</CardTitle>
      <CardDescription>A few components wired together.</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </CardContent>
    <CardFooter className="flex flex-wrap gap-2">
      <Button onClick={showSubscribedToast}>Subscribe</Button>
      <DemoDialog />
      <DemoDropdownMenu />
    </CardFooter>
  </Card>
);

/** Dialog opened by an outline button and closed from its footer. */
const DemoDialog = (): ReactElement => (
  <Dialog>
    <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Hello</DialogTitle>
        <DialogDescription>This is a shadcn/ui dialog.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button />}>Close</DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

/** Dropdown menu whose items report the picked action through a toast. */
const DemoDropdownMenu = (): ReactElement => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="outline" />}>Menu</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => toast("Profile selected")}>Profile</DropdownMenuItem>
      <DropdownMenuItem onClick={() => toast("Settings selected")}>Settings</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

/** Fires the success toast for the subscribe button. */
const showSubscribedToast = (): void => {
  toast.success("Subscribed", { description: "Thanks for trying the demo." });
};
