import { PrismaClient, Role } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Database seeden...')

  // Admin (Björn)
  const admin = await prisma.user.upsert({
    where: { email: 'bjorn@scheepers.one' },
    update: {},
    create: {
      name: 'Björn',
      email: 'bjorn@scheepers.one',
      password: await argon2.hash('changeme123', { type: argon2.argon2id }),
      role: Role.admin,
    },
  })
  console.log('✅ Admin aangemaakt:', admin.email)

  // Ouder (Anja)
  const parent = await prisma.user.upsert({
    where: { email: 'anja@scheepers.one' },
    update: {},
    create: {
      name: 'Anja',
      email: 'anja@scheepers.one',
      password: await argon2.hash('changeme123', { type: argon2.argon2id }),
      role: Role.parent,
    },
  })
  console.log('✅ Ouder aangemaakt:', parent.email)

  // Kind (Julie)
  const child = await prisma.user.upsert({
    where: { email: 'julie@scheepers.one' },
    update: {},
    create: {
      name: 'Julie',
      email: 'julie@scheepers.one',
      pin: await argon2.hash('1234', { type: argon2.argon2id }),
      role: Role.child,
      avatarUrl: '/avatars/julie.svg',
    },
  })
  console.log('✅ Kind aangemaakt:', child.name, '(PIN: 1234)')

  // Standaard token-configs voor Julie (globale configs, sourceId = null)
  const defaultConfigs = [
    { sourceType: 'morning_routine' as const, tokensPerCompletion: 3 },
    { sourceType: 'emotion_checkin' as const, tokensPerCompletion: 1 },
    { sourceType: 'bedtime_routine' as const, tokensPerCompletion: 3 },
    { sourceType: 'streak' as const, tokensPerCompletion: 2 },
  ]

  for (const cfg of defaultConfigs) {
    const exists = await prisma.tokenConfig.findFirst({
      where: { childId: child.id, sourceType: cfg.sourceType, sourceId: null },
    })
    if (!exists) {
      await prisma.tokenConfig.create({
        data: {
          childId: child.id,
          sourceType: cfg.sourceType,
          enabled: true,
          tokensPerCompletion: cfg.tokensPerCompletion,
          createdById: admin.id,
        },
      })
    }
  }

  // Standaard beloningen
  const rewards = [
    { title: '15 min extra schermtijd', costTokens: 5, category: 'schermtijd', sortOrder: 1 },
    { title: 'Samen een spelletje spelen', costTokens: 10, category: 'activiteit', sortOrder: 2 },
    { title: 'Kiezen wat we eten vanavond', costTokens: 20, category: 'activiteit', sortOrder: 3 },
    { title: 'Uitstapje naar het zwembad', costTokens: 50, category: 'uitstapje', sortOrder: 4 },
    { title: 'Groot cadeau', costTokens: 100, category: 'cadeau', sortOrder: 5 },
  ]

  for (const reward of rewards) {
    await prisma.reward.create({
      data: { ...reward, childId: child.id, requiresApproval: true },
    }).catch(() => {}) // negeer duplicaten
  }
  console.log('✅ Standaard beloningen aangemaakt')

  // Dagschema voor elke weekdag (maandag t/m vrijdag = schooldagen)
  const schoolActivities = [
    { title: 'Opstaan & aankleden', icon: '👕', startTime: '07:00', durationMinutes: 20, color: '#F2C94C',
      steps: [{ title: 'Uit bed komen' }, { title: 'Naar toilet' }, { title: 'Aankleden' }] },
    { title: 'Ontbijt', icon: '🥣', startTime: '07:20', durationMinutes: 20, color: '#E8734A', steps: [] },
    { title: 'Tanden poetsen & wassen', icon: '🦷', startTime: '07:40', durationMinutes: 10, color: '#7BAFA3',
      steps: [{ title: 'Tanden poetsen (2 min)' }, { title: 'Gezicht wassen' }, { title: 'Haar kammen' }] },
    { title: 'Schooltas inpakken', icon: '🎒', startTime: '07:50', durationMinutes: 10, color: '#5B8C5A',
      steps: [{ title: 'Agenda in de tas' }, { title: 'Brooddoos erin' }, { title: 'Waterfles erin' }, { title: 'Gymkleren check' }] },
    { title: 'Naar school', icon: '🚌', startTime: '08:10', durationMinutes: 20, color: '#A8C5D6', steps: [] },
    { title: 'School', icon: '🏫', startTime: '08:30', durationMinutes: 360, color: '#8C7B6B', steps: [] },
    { title: 'Thuiskomen & snack', icon: '🍎', startTime: '14:30', durationMinutes: 20, color: '#E8734A', steps: [] },
    { title: 'Huiswerk / oefenen', icon: '📚', startTime: '15:00', durationMinutes: 45, color: '#7BAFA3',
      steps: [{ title: 'Agenda nakijken wat er moet' }, { title: 'Huiswerk maken' }, { title: 'Tas klaar voor morgen' }] },
    { title: 'Vrije tijd', icon: '🎮', startTime: '15:45', durationMinutes: 105, color: '#F2C94C', steps: [] },
    { title: 'Avondeten', icon: '🍽️', startTime: '17:30', durationMinutes: 30, color: '#E8734A', steps: [] },
    { title: 'Vrije tijd (familie)', icon: '🛋️', startTime: '18:00', durationMinutes: 90, color: '#5B8C5A', steps: [] },
    { title: 'Bedtijdroutine', icon: '🌙', startTime: '19:30', durationMinutes: 30, color: '#A8C5D6',
      steps: [{ title: 'Pyjama aan' }, { title: 'Tanden poetsen' }, { title: 'Naar toilet' }, { title: 'In bed liggen' }, { title: 'Boekje lezen of luisteren' }] },
    { title: 'Slaaptijd', icon: '💤', startTime: '20:00', durationMinutes: 600, color: '#8C7B6B', steps: [] },
  ]

  const weekendActivities = [
    { title: 'Rustig wakker worden', icon: '☀️', startTime: '08:00', durationMinutes: 30, color: '#F2C94C', steps: [] },
    { title: 'Ontbijt', icon: '🥐', startTime: '08:30', durationMinutes: 30, color: '#E8734A', steps: [] },
    { title: 'Aankleden', icon: '👕', startTime: '09:00', durationMinutes: 15, color: '#7BAFA3',
      steps: [{ title: 'Naar toilet' }, { title: 'Aankleden' }, { title: 'Tanden poetsen' }] },
    { title: 'Vrije tijd', icon: '🎨', startTime: '09:15', durationMinutes: 165, color: '#F2C94C', steps: [] },
    { title: 'Lunch', icon: '🥪', startTime: '12:00', durationMinutes: 30, color: '#E8734A', steps: [] },
    { title: 'Middagactiviteit', icon: '🌳', startTime: '12:30', durationMinutes: 180, color: '#5B8C5A', steps: [] },
    { title: 'Avondeten', icon: '🍽️', startTime: '17:30', durationMinutes: 30, color: '#E8734A', steps: [] },
    { title: 'Bedtijdroutine', icon: '🌙', startTime: '20:00', durationMinutes: 30, color: '#A8C5D6',
      steps: [{ title: 'Pyjama aan' }, { title: 'Tanden poetsen' }, { title: 'In bed liggen' }] },
    { title: 'Slaaptijd', icon: '💤', startTime: '20:30', durationMinutes: 600, color: '#8C7B6B', steps: [] },
  ]

  // Maandag t/m vrijdag = schooldag (1-5), zaterdag+zondag = weekend (0, 6)
  for (let day = 0; day <= 6; day++) {
    const activities = day === 0 || day === 6 ? weekendActivities : schoolActivities

    const existing = await prisma.schedule.findFirst({ where: { userId: child.id, dayOfWeek: day } })
    if (existing) continue

    const schedule = await prisma.schedule.create({
      data: { userId: child.id, dayOfWeek: day },
    })

    for (let i = 0; i < activities.length; i++) {
      const { steps, ...actData } = activities[i]
      await prisma.activity.create({
        data: {
          ...actData,
          scheduleId: schedule.id,
          sortOrder: i,
          notifyBefore: [5, 1],
          steps: steps.length ? { create: steps.map((s, j) => ({ title: s.title, sortOrder: j })) } : undefined,
        },
      })
    }
  }
  console.log('✅ Dagschema\'s aangemaakt (ma-vr: school, za-zo: weekend)')

  // Voorbeeldtaken voor vandaag
  const todayTasks = [
    {
      title: 'Huiswerk wiskunde',
      icon: '📐',
      durationMinutes: 20,
      steps: [
        { title: 'Bladzijde 34, opgave 1 t/m 5' },
        { title: 'Nakijken met antwoordenboek' },
        { title: 'Tas inpakken voor morgen' },
      ],
    },
    {
      title: 'Kamer opruimen',
      icon: '🧹',
      durationMinutes: 15,
      steps: [
        { title: 'Kleren ophangen of in de was' },
        { title: 'Speelgoed op zijn plek' },
        { title: 'Bureau netjes' },
      ],
    },
  ]

  for (const t of todayTasks) {
    const exists = await prisma.task.findFirst({ where: { childId: child.id, title: t.title } })
    if (!exists) {
      await prisma.task.create({
        data: {
          childId: child.id,
          createdById: admin.id,
          title: t.title,
          icon: t.icon,
          durationMinutes: t.durationMinutes,
          scheduledFor: new Date(),
          steps: { create: t.steps.map((s, i) => ({ title: s.title, sortOrder: i })) },
        },
      })
    }
  }
  console.log('✅ Voorbeeldtaken aangemaakt')

  console.log('\n🎉 Seed voltooid!')
  console.log('   Admin: bjorn@scheepers.one / changeme123')
  console.log('   Ouder: anja@scheepers.one / changeme123')
  console.log('   Kind:  Julie (PIN: 1234)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
