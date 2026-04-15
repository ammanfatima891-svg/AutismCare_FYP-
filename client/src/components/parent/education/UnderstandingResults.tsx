import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';

export function UnderstandingResults() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Understanding Your Screening Results</h1>
        <p className="text-lg text-muted-foreground">
          What your child's screening scores mean and next steps
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How Screening Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground mb-4">
            Developmental screenings use standardized questionnaires to assess your child's development in key areas.
            The results help identify potential developmental concerns that may benefit from further evaluation or early intervention.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> Screening results are not a diagnosis. They indicate whether further professional
              evaluation is recommended.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border bg-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5" />
              Typical Development
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-primary mb-3">
              Your child's scores fall within the expected range for their age.
            </p>
            <ul className="text-sm text-primary space-y-1">
              <li>• Continue regular developmental monitoring</li>
              <li>• Schedule routine well-child visits</li>
              <li>• No immediate concerns identified</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Monitor Closely
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 mb-3">
              Some areas show potential concerns that should be monitored.
            </p>
            <ul className="text-sm text-yellow-600 space-y-1">
              <li>• Schedule follow-up screening in 3-6 months</li>
              <li>• Discuss concerns with pediatrician</li>
              <li>• Consider developmental support services</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border bg-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TrendingUp className="h-5 w-5" />
              Further Evaluation Recommended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-3">
              Results suggest potential developmental concerns.
            </p>
            <ul className="text-sm text-destructive space-y-1">
              <li>• Consult with developmental specialist</li>
              <li>• Consider comprehensive evaluation</li>
              <li>• Early intervention services may be beneficial</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Understanding Score Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">ASQ-3 (Ages & Stages Questionnaires)</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Badge variant="outline" className="mb-2">Communication</Badge>
                  <p className="text-sm text-muted-foreground">How your child understands and uses language</p>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Gross Motor</Badge>
                  <p className="text-sm text-muted-foreground">Large muscle movements and coordination</p>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Fine Motor</Badge>
                  <p className="text-sm text-muted-foreground">Small muscle movements and dexterity</p>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Problem Solving</Badge>
                  <p className="text-sm text-muted-foreground">Thinking and learning skills</p>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Personal-Social</Badge>
                  <p className="text-sm text-muted-foreground">Social and emotional development</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">M-CHAT-R (Modified Checklist for Autism)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Screens for early signs of autism spectrum disorder by assessing:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Social communication skills</li>
                <li>• Play and imaginative activities</li>
                <li>• Repetitive behaviors and restricted interests</li>
                <li>• Response to sensory input</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps After Screening</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">If Results Are Typical</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Continue age-appropriate activities</li>
                  <li>• Monitor developmental milestones</li>
                  <li>• Schedule regular pediatric check-ups</li>
                  <li>• Engage in interactive play and learning</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">If Further Evaluation Is Recommended</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Contact your pediatrician for guidance</li>
                  <li>• Request referral to developmental specialist</li>
                  <li>• Consider early intervention services</li>
                  <li>• Keep detailed records of concerns</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Remember</h4>
              <p className="text-sm text-yellow-700">
                Early intervention can make a significant difference. If you have concerns about your child's development,
                don't wait for screening results—discuss them with your healthcare provider.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Support Resources</h3>
            <p className="text-blue-700 mb-4">
              You're not alone in this journey. Here are some resources for additional support:
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Local Resources:</strong><br />
                Contact your local early intervention program
              </div>
              <div>
                <strong>Professional Help:</strong><br />
                Consult with pediatricians, developmental specialists
              </div>
              <div>
                <strong>Parent Support:</strong><br />
                Connect with other parents through support groups
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
