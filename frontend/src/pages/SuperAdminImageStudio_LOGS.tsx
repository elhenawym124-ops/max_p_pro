// تبويب Logs فقط - للإضافة في النهاية

      {/* Tab 3: Logs */}
      {currentTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <LogIcon />
              <Typography variant="h6">سجلات التوليد</Typography>
            </Box>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>تصفية حسب الحالة</InputLabel>
              <Select
                value={logsFilter}
                label="تصفية حسب الحالة"
                onChange={(e) => setLogsFilter(e.target.value)}
              >
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="completed">نجحت</MenuItem>
                <MenuItem value="failed">فشلت</MenuItem>
                <MenuItem value="processing">قيد المعالجة</MenuItem>
                <MenuItem value="queued">في الانتظار</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الوقت</TableCell>
                  <TableCell>الشركة</TableCell>
                  <TableCell>المستخدم</TableCell>
                  <TableCell>الوصف</TableCell>
                  <TableCell>النموذج</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>المدة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" py={4}>
                        لا توجد سجلات
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <ClockIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {new Date(log.createdAt).toLocaleString('ar-EG')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {log.company?.name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: 300, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={log.prompt}
                        >
                          {log.prompt}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.modelType === 'basic' ? 'Basic' : 'Pro'} 
                          size="small"
                          color={log.modelType === 'basic' ? 'default' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        {log.status === 'completed' && (
                          <Chip 
                            icon={<CheckCircleIcon />}
                            label="نجحت" 
                            size="small" 
                            color="success"
                          />
                        )}
                        {log.status === 'failed' && (
                          <Chip 
                            icon={<ErrorIcon />}
                            label="فشلت" 
                            size="small" 
                            color="error"
                          />
                        )}
                        {log.status === 'processing' && (
                          <Chip 
                            label="قيد المعالجة" 
                            size="small" 
                            color="warning"
                          />
                        )}
                        {log.status === 'queued' && (
                          <Chip 
                            label="في الانتظار" 
                            size="small" 
                            color="info"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {log.metadata && JSON.parse(log.metadata).duration ? (
                          <Typography variant="body2">
                            {(JSON.parse(log.metadata).duration / 1000).toFixed(2)}s
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {logs.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                عرض {logs.length} سجل
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={loadLogs}
              >
                تحديث
              </Button>
            </Box>
          )}
        </Paper>
      )}
