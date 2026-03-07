
import { toast } from '@/components/ui/use-toast'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast({
      title: 'Update available',
      description: 'A new version of the app is available.',
      action: (
        <button
          className="ml-4 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => updateSW(true)}
        >
          Reload
        </button>
      ),
    })
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
