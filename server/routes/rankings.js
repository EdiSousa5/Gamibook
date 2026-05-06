const express = require('express')
const pool = require('../utils/db.js')
const router = express.Router()

router.get('/user-points-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const result = await pool.query(
      'SELECT COALESCE(SUM(points), 0) as total FROM directus_collections WHERE collection = ? AND user_id = ?',
      [userId],
    )
    res.json({ data: result.rows[0]?.total ?? 0 })
  } catch (error) {
    console.error('Error fetching user points:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch user points' })
  }
})

router.get('/all-user-points', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, COALESCE(SUM(points), 0) as total_points FROM user_points_history GROUP BY user_id ORDER BY total_points DESC',
    )
    res.json({ data: result.rows })
  } catch (error) {
    console.error('Error fetching all user points:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch user points' })
  }
})

module.exports = router
