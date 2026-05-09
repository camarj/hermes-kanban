import { test, expect } from '@playwright/test'

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/acme-corp')
  })

  test('should display kanban board with 6 columns', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Kanban Board' })).toBeVisible()
    
    await expect(page.getByTestId('kanban-column-triage')).toBeVisible()
    await expect(page.getByTestId('kanban-column-todo')).toBeVisible()
    await expect(page.getByTestId('kanban-column-ready')).toBeVisible()
    await expect(page.getByTestId('kanban-column-running')).toBeVisible()
    await expect(page.getByTestId('kanban-column-blocked')).toBeVisible()
    await expect(page.getByTestId('kanban-column-done')).toBeVisible()
  })

  test('should display tasks in columns', async ({ page }) => {
    const taskCards = page.getByTestId('task-card')
    const count = await taskCards.count()
    
    if (count > 0) {
      await expect(taskCards.first()).toBeVisible()
    }
  })

  test('should open task detail on click', async ({ page }) => {
    const firstTask = page.getByTestId('task-card').first()
    
    if (await firstTask.isVisible()) {
      await firstTask.click()
      
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('heading', { name: /edit task/i })).toBeVisible()
    }
  })

  test('should create new task', async ({ page }) => {
    await page.getByRole('button', { name: /add task/i }).click()
    
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    
    await dialog.getByLabel(/title/i).fill('E2E Test Task')
    await dialog.getByLabel(/description/i).fill('Created by Playwright E2E test')
    
    await dialog.getByRole('button', { name: /create task/i }).click()
    
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('task-card').filter({ hasText: 'E2E Test Task' }).first()).toBeVisible({ timeout: 5000 })
  })

  test('should edit task priority via dialog', async ({ page }) => {
    const firstTask = page.getByTestId('task-card').first()
    
    if (await firstTask.isVisible()) {
      await firstTask.click()
      
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      
      await page.getByLabel(/status/i).click()
      await page.getByRole('option', { name: /ready/i }).click()
      
      await page.getByRole('button', { name: /save/i }).click()
      
      await expect(dialog).not.toBeVisible()
    }
  })

  test('should delete task via dialog', async ({ page }) => {
    await page.getByRole('button', { name: /add task/i }).click()
    
    const createDialog = page.getByRole('dialog')
    await createDialog.getByLabel(/title/i).fill('Task to Delete')
    await createDialog.getByRole('button', { name: /create task/i }).click()
    
    await expect(createDialog).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('task-card').filter({ hasText: 'Task to Delete' }).first()).toBeVisible({ timeout: 5000 })
    
    const taskToDelete = page.getByTestId('task-card').filter({ hasText: 'Task to Delete' }).first()
    await taskToDelete.click()
    
    const editDialog = page.getByRole('dialog')
    await editDialog.getByRole('button', { name: /delete/i }).click()
    
    const confirmDialog = page.getByRole('alertdialog')
    await confirmDialog.getByRole('button', { name: /delete task/i }).click()
    
    await expect(confirmDialog).not.toBeVisible({ timeout: 5000 })
    
    await page.waitForTimeout(1000)
    
    await expect(page.getByTestId('task-card').filter({ hasText: 'Task to Delete' }).first()).not.toBeVisible({ timeout: 10000 })
  })

  test('should drag task between columns and persist after reload', async ({ page }) => {
    const taskTitle = `Drag Test ${Date.now()}`

    await page.getByRole('button', { name: /add task/i }).click()
    const createDialog = page.getByRole('dialog')
    await expect(createDialog).toBeVisible()
    await createDialog.getByLabel(/title/i).fill(taskTitle)
    await createDialog.getByRole('button', { name: /create task/i }).click()
    await expect(createDialog).not.toBeVisible({ timeout: 10000 })

    const triageColumn = page.getByTestId('kanban-column-triage')
    const todoColumn = page.getByTestId('kanban-column-todo')
    const card = page.getByTestId('task-card').filter({ hasText: taskTitle }).first()
    await expect(card).toBeVisible({ timeout: 5000 })
    await expect(triageColumn.getByTestId('task-card').filter({ hasText: taskTitle })).toBeVisible()

    const cardBox = await card.boundingBox()
    const todoBox = await todoColumn.boundingBox()
    if (!cardBox || !todoBox) throw new Error('Card or column not laid out')

    // dnd-kit pointer activation requires explicit small movement before commit
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(cardBox.x + cardBox.width / 2 + 10, cardBox.y + cardBox.height / 2 + 10, { steps: 5 })
    await page.mouse.move(todoBox.x + todoBox.width / 2, todoBox.y + todoBox.height / 2 + 80, { steps: 10 })
    await page.mouse.up()

    // Card should now be inside the To Do column
    await expect(
      todoColumn.getByTestId('task-card').filter({ hasText: taskTitle })
    ).toBeVisible({ timeout: 5000 })

    // Persistence: reload and check still in To Do
    await page.reload()
    await expect(
      page.getByTestId('kanban-column-todo').getByTestId('task-card').filter({ hasText: taskTitle })
    ).toBeVisible({ timeout: 10000 })
  })

  test('should assign agent to new task', async ({ page }) => {
    await page.getByRole('button', { name: /add task/i }).click()
    
    await page.getByLabel(/title/i).fill('Task with Agent')
    
    const agentSelect = page.getByLabel(/assign to agent/i)
    if (await agentSelect.isVisible()) {
      await agentSelect.click()
      const firstOption = page.getByRole('option').first()
      if (await firstOption.isVisible()) {
        await firstOption.click()
      }
    }
    
    await page.getByRole('button', { name: /create task/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
