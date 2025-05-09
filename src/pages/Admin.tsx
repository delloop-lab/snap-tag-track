import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, Users, Receipt, ShieldCheck, Tag, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  email: string;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

interface Client {
  name: string;
  receiptCount: number;
}

const Admin = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReceipts: 0,
    totalWarranties: 0,
    tagCounts: [] as { tag: string; count: number }[],
    loading: true,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total users
        const { count: userCount } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true });

        // Fetch all receipts
        const { data: receipts } = await supabase
          .from("receipts")
          .select("id, warranty, purchase_date, client_name");

        // Total receipts
        const totalReceipts = receipts?.length || 0;

        // Total warranties
        const totalWarranties = receipts?.filter(r => r.warranty).length || 0;

        // Client counts
        const clientMap: Record<string, number> = {};
        receipts?.forEach(r => {
          if (r.client_name) {
            clientMap[r.client_name] = (clientMap[r.client_name] || 0) + 1;
          }
        });
        const clientList = Object.entries(clientMap)
          .map(([name, count]) => ({ name, receiptCount: count }))
          .sort((a, b) => b.receiptCount - a.receiptCount);
        setClients(clientList);
        setClientsLoading(false);

        // Fetch all receipt tags
        const { data: receiptTags } = await supabase
          .from("receipt_tags")
          .select("tag_id, tags(name)");

        // Tag counts
        const tagMap: Record<string, number> = {};
        receiptTags?.forEach(rt => {
          const tagName = rt.tags?.name;
          if (tagName) {
            tagMap[tagName] = (tagMap[tagName] || 0) + 1;
          }
        });
        const tagCounts = Object.entries(tagMap).map(([tag, count]) => ({ tag, count }));

        setStats({
          totalUsers: userCount || 0,
          totalReceipts,
          totalWarranties,
          tagCounts,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchStats();
    fetchUsers();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Title Page */}
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-96 h-96 bg-blue-400 opacity-20 rounded-full blur-3xl absolute -top-32 -left-32 animate-pulse"></div>
          <div className="w-96 h-96 bg-blue-800 opacity-20 rounded-full blur-3xl absolute -bottom-32 -right-32 animate-pulse"></div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg animate-fade-in">
          Admin Dashboard
        </h1>
        <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto animate-fade-in-up">
          Monitor your application's performance and user engagement with real-time analytics
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center animate-fade-in-up">
          <div className="flex items-center gap-2 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <Users className="h-6 w-6" />
            <span>User Analytics</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <Receipt className="h-6 w-6" />
            <span>Receipt Management</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <Tag className="h-6 w-6" />
            <span>Tag Analytics</span>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Analytics Overview
          </h2>
          
          {stats.loading ? (
            <div className="text-center text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-gray-500">Active accounts</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total Receipts</CardTitle>
                    <Receipt className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="ghost" 
                      className="p-0 h-auto hover:bg-transparent"
                      onClick={() => navigate("/admin/receipts")}
                    >
                      <div className="text-3xl font-bold">{stats.totalReceipts}</div>
                      <p className="text-xs text-gray-500">Uploaded receipts</p>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total Warranties</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalWarranties}</div>
                    <p className="text-xs text-gray-500">Active warranties</p>
                  </CardContent>
                </Card>
              </div>

              {/* User List */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    User List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="text-center text-gray-400">Loading users...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {user.avatar_url && (
                                  <img
                                    src={user.avatar_url}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                                <div>
                                  {user.first_name || user.last_name ? (
                                    <div className="font-medium">
                                      {[user.first_name, user.last_name].filter(Boolean).join(" ")}
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 italic">No name set</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{format(new Date(user.created_at), "MMM d, yyyy")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Client List */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    Client List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clientsLoading ? (
                    <div className="text-center text-gray-400">Loading clients...</div>
                  ) : clients.length === 0 ? (
                    <div className="text-center text-gray-500">No clients found</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client Name</TableHead>
                          <TableHead className="text-right">Receipt Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clients.map((client) => (
                          <TableRow key={client.name}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell className="text-right">{client.receiptCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tag Distribution Chart */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 p-6 pb-0">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Tag Distribution
                  </h2>
                  <div className="h-[300px] p-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.tagCounts}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                        <XAxis dataKey="tag" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Tag Pie Chart */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 p-6 pb-0">
                    <PieChartIcon className="h-5 w-5 text-purple-500" />
                    Tag Usage
                  </h2>
                  <div className="h-[300px] p-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.tagCounts}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {stats.tagCounts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Tag Table */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-green-500" />
                    Detailed Tag Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tag</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Count</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.tagCounts.map((tc, index) => (
                          <tr key={tc.tag} className="border-b hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                {tc.tag}
                              </div>
                            </td>
                            <td className="text-right py-3 px-4 font-medium">{tc.count}</td>
                            <td className="text-right py-3 px-4 text-gray-500">
                              {((tc.count / stats.totalReceipts) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin; 