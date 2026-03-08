"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Edit, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Fornecedor {
  id: string
  nome: string
  cnpj: string
  cidade: string
  estado: string
  vendedor_nome: string
  vendedor_telefone: string
  vendedor_email: string
  telefone_geral: string
  site_distribuidor: string
  login_email: string
  login_senha: string
  observacoes: string
  tipos_material: string[]
  ativo: boolean
  created_at: string
  updated_at: string
}

const MATERIAL_TYPES = [
  "Kit Fotovoltaico",
  "String Box",
  "Estrutura Placas Telhado",
  "Estrutura Placas Solo",
  "Estrutura Placas Carport",
  "Cabo Solar",
  "Material CA",
]

const ESTADOS_BRASIL = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]

export function FornecedoresCadastro() {
  const [showPassword, setShowPassword] = useState(false)
  // Função para aplicar máscara de telefone (formato (99) 99999-9999 ou (99) 9999-9999)
  function maskPhone(value: string) {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1")
  }
  // Função para aplicar máscara de CNPJ
  function maskCNPJ(value: string) {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1")
  }
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    cidade: "",
    estado: "",
    vendedor_nome: "",
    vendedor_telefone: "",
    vendedor_email: "",
    telefone_geral: "",
    site_distribuidor: "",
    login_email: "",
    login_senha: "",
    observacoes: "",
    tipos_material: [] as string[],
  })

  useEffect(() => {
    fetchFornecedores()
  }, [])

  const fetchFornecedores = async () => {
    try {
      const response = await fetch("/api/fornecedores")
      if (response.ok) {
        const data = await response.json()
        setFornecedores(data)
      } else {
        toast({
          title: "Erro",
          description: "Falha ao carregar fornecedores",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nome: "",
      cnpj: "",
      cidade: "",
      estado: "",
      vendedor_nome: "",
      vendedor_telefone: "",
      vendedor_email: "",
      telefone_geral: "",
      site_distribuidor: "",
      login_email: "",
      login_senha: "",
      observacoes: "",
      tipos_material: [],
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome do fornecedor é obrigatório",
        variant: "destructive",
      })
      return
    }

    try {
      const url = editingId ? `/api/fornecedores/${editingId}` : "/api/fornecedores"
      const method = editingId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: editingId ? "Fornecedor atualizado com sucesso" : "Fornecedor cadastrado com sucesso",
        })
        resetForm()
        fetchFornecedores()
      } else {
        toast({
          title: "Erro",
          description: "Falha ao salvar fornecedor",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (fornecedor: Fornecedor) => {
    setFormData({
      nome: fornecedor.nome,
      cnpj: fornecedor.cnpj || "",
      cidade: fornecedor.cidade || "",
      estado: fornecedor.estado || "",
      vendedor_nome: fornecedor.vendedor_nome || "",
      vendedor_telefone: fornecedor.vendedor_telefone || "",
      vendedor_email: fornecedor.vendedor_email || "",
      telefone_geral: fornecedor.telefone_geral || "",
      site_distribuidor: fornecedor.site_distribuidor || "",
      login_email: fornecedor.login_email || "",
      login_senha: fornecedor.login_senha || "",
      observacoes: fornecedor.observacoes || "",
      tipos_material: fornecedor.tipos_material || [],
    })
    setEditingId(fornecedor.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return

    try {
      const response = await fetch(`/api/fornecedores/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Fornecedor excluído com sucesso",
        })
        fetchFornecedores()
      } else {
        toast({
          title: "Erro",
          description: "Falha ao excluir fornecedor",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      })
    }
  }

  const toggleMaterialType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      tipos_material: prev.tipos_material.includes(type)
        ? prev.tipos_material.filter((t) => t !== type)
        : [...prev.tipos_material, type],
    }))
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cadastro de Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie os fornecedores de materiais fotovoltaicos</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</CardTitle>
            <CardDescription>Preencha as informações do fornecedor</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Fornecedor *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                    required
                    className="border border-gray-400" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cnpj: maskCNPJ(e.target.value) }))}
                    className="border border-gray-400" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cidade: e.target.value }))}
                    className="border border-gray-400" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData((prev) => ({ ...prev, estado: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecione o estado</option>
                    {ESTADOS_BRASIL.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendedor_nome">Nome do Vendedor</Label>
                  <Input
                    id="vendedor_nome"
                    value={formData.vendedor_nome}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vendedor_nome: e.target.value }))}
                    className="border border-gray-400" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendedor_telefone">Telefone do Vendedor</Label>
                  <Input
                    id="vendedor_telefone"
                    value={formData.vendedor_telefone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vendedor_telefone: maskPhone(e.target.value) }))}
                    className="border border-gray-400" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendedor_email">E-mail do Vendedor</Label>
                  <Input
                    id="vendedor_email"
                    type="email"
                    value={formData.vendedor_email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vendedor_email: e.target.value }))}
                    className="border border-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone_geral">Telefone Geral do Distribuidor</Label>
                  <Input
                    id="telefone_geral"
                    value={formData.telefone_geral}
                    onChange={(e) => setFormData((prev) => ({ ...prev, telefone_geral: maskPhone(e.target.value) }))}
                    className="border border-gray-400" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site_distribuidor">Site do Distribuidor</Label>
                  <Input
                    id="site_distribuidor"
                    type="url"
                    value={formData.site_distribuidor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, site_distribuidor: e.target.value }))}
                    className="border border-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="login_email">Login da Plataforma (E-mail)</Label>
                  <Input
                    id="login_email"
                    type="email"
                    value={formData.login_email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, login_email: e.target.value }))}
                    className="border border-gray-400" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login_senha">Senha da Plataforma</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="login_senha"
                      type={showPassword ? "text" : "password"}
                      value={formData.login_senha}
                      onChange={(e) => setFormData((prev) => ({ ...prev, login_senha: e.target.value }))}
                      className="border border-gray-400 pr-10" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.96 9.96 0 012.125-6.175M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.175-2.125A9.96 9.96 0 0122 9c0 5.523-4.477 10-10 10a10.05 10.05 0 01-1.875-.175" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm2.25 2.25l3.5 3.5M4.21 4.21l15.58 15.58" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Material que o Fornecedor Vende</Label>
                <div className="flex flex-wrap gap-2">
                  {MATERIAL_TYPES.map((type) => (
                    <Badge
                      key={type}
                      variant={formData.tipos_material.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleMaterialType(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                  rows={3}
                  className="border border-gray-400" />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {editingId ? "Atualizar" : "Salvar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {fornecedores.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Nenhum fornecedor cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          fornecedores.map((fornecedor) => (
            <Card key={fornecedor.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{fornecedor.nome}</h3>
                      {fornecedor.cnpj && <Badge variant="outline">{fornecedor.cnpj}</Badge>}
                    </div>

                    {(fornecedor.cidade || fornecedor.estado) && (
                      <p className="text-sm text-muted-foreground">
                        {[fornecedor.cidade, fornecedor.estado].filter(Boolean).join(", ")}
                      </p>
                    )}

                    {fornecedor.vendedor_nome && (
                      <div className="text-sm">
                        <strong>Vendedor:</strong> {fornecedor.vendedor_nome}
                        {fornecedor.vendedor_telefone && ` - ${fornecedor.vendedor_telefone}`}
                        {fornecedor.vendedor_email && ` - ${fornecedor.vendedor_email}`}
                      </div>
                    )}

                    {fornecedor.site_distribuidor && (
                      <div className="text-sm">
                        <strong>Site:</strong>{" "}
                        <a
                          href={fornecedor.site_distribuidor}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {fornecedor.site_distribuidor}
                        </a>
                      </div>
                    )}

                    {fornecedor.tipos_material.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {fornecedor.tipos_material.map((tipo) => (
                          <Badge key={tipo} variant="secondary" className="text-xs">
                            {tipo}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {fornecedor.observacoes && (
                      <p className="text-sm text-muted-foreground mt-2">{fornecedor.observacoes}</p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(fornecedor)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(fornecedor.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
