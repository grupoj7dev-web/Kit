import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MicroSelectorFieldProps {
    value?: number
    onChange: (value: number | undefined) => void
}

export function MicroSelectorField({ value, onChange }: MicroSelectorFieldProps) {
    return (
        <div>
            <Label htmlFor="modulosPorMicro">Módulos por Microinversor</Label>
            <Select
                value={value?.toString() || "0"}
                onValueChange={(val) => onChange(val === "0" ? undefined : Number(val))}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Automático" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="0">Automático</SelectItem>
                    <SelectItem value="4">4 módulos por micro</SelectItem>
                    <SelectItem value="6">6 módulos por micro</SelectItem>
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
                Escolha quantos módulos por microinversor ou deixe em automático
            </p>
        </div>
    )
}
