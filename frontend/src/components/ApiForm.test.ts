import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ApiForm from '@/components/ApiForm.vue'
import type { ApiDefinition } from '@/types/api'

const api: ApiDefinition = {
  name: 'Create Alert',
  chineseName: '创建警报',
  endpoint: '/shodan/alert',
  params: ['name', 'filters'],
  optionalParams: ['expires'],
  method: 'POST',
  jsonParams: ['filters'],
  jsonBody: ['name', 'filters', 'expires']
}

describe('ApiForm', () => {
  it('emits parsed JSON and optional values', async () => {
    const wrapper = mount(ApiForm, { props: { api } })
    await wrapper.get('#parameter-name').setValue('Production alert')
    await wrapper.get('#parameter-filters').setValue('{"ip":["1.1.1.1"]}')
    await wrapper.get('#parameter-expires').setValue('3600')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      name: 'Production alert',
      filters: { ip: ['1.1.1.1'] },
      expires: '3600'
    })
  })

  it('shows a validation error instead of silently accepting malformed JSON', async () => {
    const wrapper = mount(ApiForm, { props: { api } })
    await wrapper.get('#parameter-name').setValue('Broken alert')
    await wrapper.get('#parameter-filters').setValue('{not-json}')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toContain('must contain valid JSON')
  })
})
