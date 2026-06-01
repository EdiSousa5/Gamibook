import { ref, watch, onUnmounted, type Ref } from 'vue'
import { normalizedDirectusUrl, getAccessToken } from '@/services/client'

/**
 * Carrega um asset do Directus via fetch autenticado (Authorization header)
 * e devolve um blob URL reactivo — o token nunca aparece em URLs de imagens.
 *
 * O blob URL é revogado automaticamente quando o componente é desmontado
 * ou quando o assetId muda.
 */
export function useAuthAsset(assetId: Ref<string | null | undefined>) {
  const blobUrl = ref<string>('')
  let currentBlob: string | null = null

  const revoke = () => {
    if (currentBlob) {
      URL.revokeObjectURL(currentBlob)
      currentBlob = null
    }
  }

  const load = async (id: string | null | undefined) => {
    revoke()

    if (!id || !normalizedDirectusUrl) {
      blobUrl.value = ''
      return
    }

    const token = getAccessToken()
    if (!token) {
      blobUrl.value = ''
      return
    }

    try {
      const response = await fetch(`${normalizedDirectusUrl}/assets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        blobUrl.value = ''
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      currentBlob = url
      blobUrl.value = url
    } catch {
      blobUrl.value = ''
    }
  }

  watch(assetId, (id) => load(id), { immediate: true })

  onUnmounted(revoke)

  return blobUrl
}
