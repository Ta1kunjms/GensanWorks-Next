import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">GensanWorks</h1>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold mb-6">
            Connect Job Seekers with Employers
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            GensanWorks is a comprehensive job matching platform that helps
            PESO officers connect qualified applicants with employers. Powered
            by AI-driven job matching and real-time collaboration tools.
          </p>
          <div className="space-x-4">
            <Link href="/signup/jobseeker">
              <Button size="lg" variant="secondary">
                I'm Looking for a Job
              </Button>
            </Link>
            <Link href="/signup/employer">
              <Button size="lg" variant="secondary">
                I'm an Employer
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center mb-12">Key Features</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <h4 className="text-xl font-semibold mb-4">AI Job Matching</h4>
              <p className="text-gray-600">
                Advanced AI algorithm matches job seekers with the most
                suitable positions based on skills and preferences.
              </p>
            </Card>
            <Card className="p-6">
              <h4 className="text-xl font-semibold mb-4">
                Real-Time Notifications
              </h4>
              <p className="text-gray-600">
                Instant alerts for job applications, status updates, and
                opportunities. Stay connected and informed.
              </p>
            </Card>
            <Card className="p-6">
              <h4 className="text-xl font-semibold mb-4">Complete Profiles</h4>
              <p className="text-gray-600">
                Comprehensive NSRP and SRS Form integration for seamless
                compliance tracking and reporting.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center mb-12">Impact</h3>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
              <p className="text-gray-600">Job Seekers</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">100+</div>
              <p className="text-gray-600">Active Employers</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">2000+</div>
              <p className="text-gray-600">Jobs Posted</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">85%</div>
              <p className="text-gray-600">Success Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-6">Ready to Get Started?</h3>
          <p className="mb-8 text-lg">
            Join thousands of job seekers and employers already using
            GensanWorks.
          </p>
          <div className="space-x-4">
            <Link href="/signup/jobseeker">
              <Button size="lg" variant="secondary">
                Sign Up as Job Seeker
              </Button>
            </Link>
            <Link href="/signup/employer">
              <Button size="lg" variant="secondary">
                Sign Up as Employer
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">GensanWorks</h4>
              <p className="text-sm">
                Connecting job seekers with employers through AI-powered
                matching.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about">About</Link>
                </li>
                <li>
                  <Link href="/jobs">Browse Jobs</Link>
                </li>
                <li>
                  <Link href="/employers">For Employers</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy">Privacy Policy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms of Service</Link>
                </li>
                <li>
                  <Link href="/contact">Contact</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <p className="text-sm">
                Email: support@gensanworks.com
                <br />
                Phone: +1 (555) 123-4567
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>
              &copy; {new Date().getFullYear()} GensanWorks. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
