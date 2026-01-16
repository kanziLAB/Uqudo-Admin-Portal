import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/dashboard/kpis
 * @desc    Get dashboard KPI metrics
 * @access  Private (All roles)
 */
router.get('/kpis', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { startDate, endDate } = req.query;

  // Build date filter
  const dateFilter = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  // Total Registrations
  let totalRegQuery = supabaseAdmin
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (Object.keys(dateFilter).length) {
    totalRegQuery = totalRegQuery.gte('created_at', dateFilter.gte || '1900-01-01');
    if (dateFilter.lte) totalRegQuery = totalRegQuery.lte('created_at', dateFilter.lte);
  }

  const { count: totalRegistrations } = await totalRegQuery;

  // Active Accounts
  const { count: activeAccounts } = await supabaseAdmin
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('account_status', 'active');

  // Verified Accounts
  const { count: verifiedAccounts } = await supabaseAdmin
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('kyc_verification_status', 'verified');

  // Pending Alerts
  const { count: pendingAlerts } = await supabaseAdmin
    .from('kyc_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['open', 'in_progress']);

  // Open Cases
  const { count: openCases } = await supabaseAdmin
    .from('aml_cases')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('resolution_status', 'unsolved');

  // Calculate growth rate (compare with previous period)
  const periodDays = startDate && endDate
    ? Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
    : 30;

  const previousStartDate = new Date(new Date(startDate || Date.now()) - periodDays * 24 * 60 * 60 * 1000);
  const previousEndDate = startDate ? new Date(startDate) : new Date();

  const { count: previousPeriodRegistrations } = await supabaseAdmin
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', previousStartDate.toISOString())
    .lte('created_at', previousEndDate.toISOString());

  const growthRate = previousPeriodRegistrations
    ? (((totalRegistrations - previousPeriodRegistrations) / previousPeriodRegistrations) * 100).toFixed(2)
    : 0;

  res.json({
    success: true,
    data: {
      totalOnboarding: totalRegistrations,
      activeAccounts,
      verifiedAccounts,
      pendingAlerts,
      openCases,
      growthRate: parseFloat(growthRate),
      period: {
        start: startDate || null,
        end: endDate || null,
        days: periodDays
      }
    }
  });
}));

/**
 * @route   GET /api/dashboard/verification-type-distribution
 * @desc    Get verification type distribution (UAE vs International)
 * @access  Private
 */
router.get('/verification-type-distribution', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { accountStatus } = req.query; // active, suspended, blocked, overall

  let query = supabaseAdmin
    .from('accounts')
    .select('verification_type')
    .eq('tenant_id', tenantId);

  if (accountStatus && accountStatus !== 'overall') {
    query = query.eq('account_status', accountStatus);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Count by verification type
  const distribution = data.reduce((acc, curr) => {
    const type = curr.verification_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  res.json({
    success: true,
    data: distribution
  });
}));

/**
 * @route   GET /api/dashboard/account-status-distribution
 * @desc    Get account status distribution
 * @access  Private
 */
router.get('/account-status-distribution', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('account_status')
    .eq('tenant_id', tenantId);

  if (error) throw error;

  const distribution = data.reduce((acc, curr) => {
    const status = curr.account_status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  res.json({
    success: true,
    data: distribution
  });
}));

/**
 * @route   GET /api/dashboard/country-distribution
 * @desc    Get top 5 countries distribution
 * @access  Private
 */
router.get('/country-distribution', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { accountStatus } = req.query;

  let query = supabaseAdmin
    .from('accounts')
    .select('country_of_residence')
    .eq('tenant_id', tenantId);

  if (accountStatus && accountStatus !== 'overall') {
    query = query.eq('account_status', accountStatus);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Count by country
  const countryCount = data.reduce((acc, curr) => {
    const country = curr.country_of_residence || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  // Get top 5
  const top5 = Object.entries(countryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .reduce((acc, [country, count]) => {
      acc[country] = count;
      return acc;
    }, {});

  res.json({
    success: true,
    data: top5
  });
}));

/**
 * @route   GET /api/dashboard/new-registrations
 * @desc    Get new registrations over time
 * @access  Private
 */
router.get('/new-registrations', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { groupBy } = req.query; // day, week, month

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('created_at, account_status')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Group data by period
  const grouped = groupDataByPeriod(data, groupBy || 'day');

  res.json({
    success: true,
    data: grouped
  });
}));

/**
 * @route   GET /api/dashboard/growth-rate
 * @desc    Get growth rate over time
 * @access  Private
 */
router.get('/growth-rate', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { groupBy } = req.query; // day, week, month

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('created_at, account_status')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Calculate growth rate by period
  const growthData = calculateGrowthRate(data, groupBy || 'day');

  res.json({
    success: true,
    data: growthData
  });
}));

// Helper function to group data by period
function groupDataByPeriod(data, groupBy) {
  const grouped = {};

  data.forEach(item => {
    const date = new Date(item.created_at);
    let key;

    switch (groupBy) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'day':
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!grouped[key]) {
      grouped[key] = { total: 0, active: 0 };
    }

    grouped[key].total++;
    if (item.account_status === 'active') {
      grouped[key].active++;
    }
  });

  return grouped;
}

// Helper function to calculate growth rate
function calculateGrowthRate(data, groupBy) {
  const grouped = groupDataByPeriod(data, groupBy);
  const periods = Object.keys(grouped).sort();
  const growthData = {};

  periods.forEach((period, index) => {
    if (index === 0) {
      growthData[period] = { total: 0, active: 0 };
    } else {
      const current = grouped[period];
      const previous = grouped[periods[index - 1]];

      growthData[period] = {
        total: previous.total ? (((current.total - previous.total) / previous.total) * 100).toFixed(2) : 0,
        active: previous.active ? (((current.active - previous.active) / previous.active) * 100).toFixed(2) : 0
      };
    }
  });

  return growthData;
}

export default router;
