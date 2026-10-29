import type { DisciplineId } from '../../../../shared/engineering';
import { h, openModal, toast } from '../../../ui/dom';
import { markdownFile } from '../../../ui/markdown';
import { flowRequest, type ArtifactView } from './api';

export async function openArtifact(floor: string, id: DisciplineId, changed: () => void, worker?: string) {
  try {
    let data = await flowRequest<ArtifactView>(floor, `artifact?discipline=${id}${worker ? `&worker=${encodeURIComponent(worker)}` : ''}`);
    const textarea = h('textarea', { 'aria-label': 'Conteúdo do artefato', maxlength: 150000 }, data.content);
    const preview = h('div.engineering-preview', {}, markdownFile(data.content));
    const status = h('span', { role: 'status' }, data.exists ? worker ? 'Entrega do agente · somente leitura' : 'Arquivo existente no projeto' : 'Template · ainda não gravado');
    if (worker) textarea.readOnly = true;
    textarea.oninput = () => { preview.replaceChildren(markdownFile(textarea.value)); status.textContent = 'Alterações não salvas'; };
    const save = h('button.btn.primary', { type: 'button', onclick: async () => {
      save.disabled = true;
      try {
        data = await flowRequest<ArtifactView>(floor, 'artifact', { discipline: id, hash: data.hash, content: textarea.value });
        status.textContent = 'Salvo no projeto'; changed();
      } catch (e) { status.textContent = (e as Error).message; }
      finally { save.disabled = false; }
    } }, data.exists ? 'Salvar artefato' : 'Criar a partir do template');
    const el = h('div.modal.engineering-modal', { role: 'dialog', 'aria-label': 'Artefato da etapa' },
      h('header', {}, h('h2', {}, data.path)), h('div.body', {}, h('div.engineering-editor', {}, textarea, preview)),
      h('footer', {}, status, worker ? null : save));
    openModal(el, { reading: true, doing: 'revisando artefato', onClose: changed });
  } catch (e) { toast((e as Error).message, 'error'); }
}
