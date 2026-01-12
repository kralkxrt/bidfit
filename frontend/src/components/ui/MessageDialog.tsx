
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

interface MessageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    variant?: "default" | "error" | "success" | "info";
}

export function MessageDialog({
    isOpen,
    onClose,
    title,
    description,
    variant = "default",
}: MessageDialogProps) {
    const getIcon = () => {
        switch (variant) {
            case "error":
                return <AlertCircle className="h-6 w-6 text-red-500" />;
            case "success":
                return <CheckCircle className="h-6 w-6 text-green-500" />;
            case "info":
            default:
                return <Info className="h-6 w-6 text-blue-500" />;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {getIcon()}
                        <DialogTitle>{title}</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={onClose}>OK</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
