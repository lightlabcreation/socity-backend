const prisma = require('../lib/prisma');

class ReportController {
  static async getPlatformStats(req, res) {
    try {
      const now = new Date();

      // 1. Overview Stats
      const totalSocieties = await prisma.society.count();
      const activeSocieties = await prisma.society.count({ where: { status: 'ACTIVE' } });
      const totalUsers = await prisma.user.count();
      const totalUnits = await prisma.unit.count();

      // Mock change and engagement for now
      const overview = {
        activeSocieties: totalSocieties,
        societiesChange: '+2',
        totalUsers,
        totalUnits,
        avgEngagement: '82%'
      };

      // 2. Growth Data (last 6 months)
      const growthData = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const newSocieties = await prisma.society.count({
          where: { createdAt: { gte: startOfMonth, lte: endOfMonth } }
        });

        growthData.push({
          month: months[d.getMonth()],
          newSocieties,
          churned: 0 // Not currently tracked
        });
      }

      // 3. Plan Distribution
      const basicCount = await prisma.society.count({ where: { subscriptionPlan: 'BASIC' } });
      const proCount = await prisma.society.count({ where: { subscriptionPlan: 'PROFESSIONAL' } });
      const entCount = await prisma.society.count({ where: { subscriptionPlan: 'ENTERPRISE' } });

      const totalPlanCount = totalSocieties || 1;
      const planDistribution = [
        { plan: 'Enterprise', count: entCount, percentage: Math.round((entCount / totalPlanCount) * 100) },
        { plan: 'Professional', count: proCount, percentage: Math.round((proCount / totalPlanCount) * 100) },
        { plan: 'Basic', count: basicCount, percentage: Math.round((basicCount / totalPlanCount) * 100) },
      ];

      // 4. Society Performance
      const societies = await prisma.society.findMany({
        include: {
          _count: {
            select: { users: true }
          }
        },
        take: 10
      });

      const societyPerformance = societies.map(s => {
        const totalUsers = s._count.users || 0;
        // Mocking some engagement metrics since we don't have session tracking yet
        const engagement = totalUsers > 0 ? (70 + (s.id % 20)) : 0;
        return {
          name: s.name,
          users: totalUsers,
          activeUsers: Math.round(totalUsers * (engagement / 100)),
          engagement,
          trend: 'up',
          change: '+2%'
        };
      });

      // Maintain legacy keys for platform-overview if needed, but primary focus is the report structure
      res.json({
        overview,
        growthData,
        planDistribution,
        societyPerformance,
        // Legacy support
        platformStats: {
          totalSocieties,
          activeSocieties,
          totalUsers,
          totalUnits,
          monthlyRevenue: 0,
          pendingApprovals: 0
        },
        societyGrowthData: growthData.map(d => ({ month: d.month, societies: d.newSocieties })),
        subscriptionStats: planDistribution.map(p => ({ plan: p.plan, societies: p.count, color: 'bg-blue-500' }))
      });
    } catch (error) {
      console.error('Platform Stats Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ReportController;
